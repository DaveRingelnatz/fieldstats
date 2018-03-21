// MODULE IMPORTS
const request = require("request")
const iniParser = require('parse-ini');
const fs = require('fs');
const _ = require('lodash');

// CONFIGURATION
/* only change folder, if you are NOT running IRI playbook 
* or insert the name of the node manually */
const fieldIniUrl = '/etc/field/field.ini';
const nodeName = "";
/* leave nodePublicIds empty if you only have 1 node
* fill in the form:
* const nodePublicIds = ["foo", "fighters"];
* if you have multiple nodes and want to sum up points and iota sponsored */
const nodePublicIds = [];

// JSON SOURCES
const urlGraph = "http://field.carriota.com/api/v1/graph";
const urlSeason = "http://field.carriota.com/api/v1/seasons";
const urlMarketcap = "https://api.coinmarketcap.com/v1/ticker/iota/"

const multiplicators = {
	attachToTangle: 50,
	broadcastTransactions: 5,
	checkConsistency: 5,
	findTransactions: 5,
	getBalances: 3,
	getInclusionStates: 3,
	getNodeInfo: 1,
	getTransactionsToApprove: 3,
	getTrytes: 3,
	storeTransactions: 20,
	wereAddressesSpentFrom: 5
};

/**
 * Web Requests 
 */

function requestGraph() {
	return new Promise((resolve, reject) => {
		request({
			url: urlGraph,
			json: true,
		}, (err, response, body) =>  {
			if (err || response.statusCode !== 200) {
				reject(err);
			} else {
				resolve(body);
			}
		});
	})
}

function requestIotaPrice() {
	return new Promise((resolve, reject) => {
		request({
			url: urlMarketcap,
			json: true,
		}, (err, response, body) => {
			if (err || response.statusCode !== 200) {
				reject(err);
			} else {
				resolve(body[0].price_usd);
			}
		});
	});
}

function requestCarriotaSeason() {
	return new Promise((resolve, reject) => {
		request({
			url: urlSeason,
			json: true,
		}, (err, response, body) => {
			if (err || response.statusCode !== 200) {
				reject(err);
			} else {
				resolve(body);
			}
		});
	});
}

/**
 * Application
 */

function getNodeName() {
	/**
	 * If a node name is set, we simply return it
	 * If not, the script validates the ini path and returns the value set in the ini.
	 * As fs.access is async, we need to wrap it into a promise to get a good programmatic flow.
	 */
	return new Promise((resolve, reject) => {
		if (nodeName) {
			return resolve(nodeName);
		} else {
			fs.access(fieldIniUrl, fs.constants.R_OK, (err) => {
				if (!err) {
					const parsedFieldIni = iniParser.parse(fieldIniUrl);
					resolve(parsedFieldIni.field.name);
				} else {
					reject('Could not find field ini, and nodeName is not set as alternative');
				}
			});
		}
	});
}

function calculateScore(workSet, key) {
	if (!workSet[key]) {
		return 0;
	}

	const Score = workSet[key] * multiplicators[key];

	return Score;
}

function getNodeScore(node) {
	// only add Score if node is online

	let Score = 0;

	/**
	 * As we have defined the multiplicators in a list
	 * We can simply iterate through every key
	 * If the node has done work for the specific key
	 * It gets calculated. Otherwise 0 is added.
	 */
	
	Object.keys(multiplicators)
		.forEach(key => {
			Score += calculateScore(node.workDone, key);
		});

	return Score;
}

function getallNodesScore(nodes) {
	let allNodesScore = 0;
	
	nodes.forEach((node) => {
		allNodesScore += getNodeScore(node);
	});

	return allNodesScore;
}

function getNodeRank(nodes, ownScore) {
	let arrayNodeRank = [];
	let rankNr = 0;
	
	// compute the score for each node
	nodes.forEach((node) => {
		arrayNodeRank.push(getNodeScore(node));
	});
	
	//sort array descending
	arrayNodeRank.sort(function(a, b){return b-a});
	
	// compute rank for node
	for (i = 0; i < arrayNodeRank.length; i++) {
		if((arrayNodeRank[i] == ownScore) && (rankNr == 0))
			rankNr = i+1;
	}
	return rankNr;
}

function getOwnNodesScoreSum(nodes, ownNodesPublicIds) {
	let arrayNodeRank = [];
	let scoreSum = 0;
	
	// compute the score for each node
	nodes.forEach((node) => {
		for (i = 0; i < ownNodesPublicIds.length; i++) {
			//console.log("publicID: "+ownNodesPublicIds[i]);
			if(node.field.publicId == ownNodesPublicIds[i]) {
				scoreSum += getNodeScore(node);
			}
		}
	});
	return scoreSum;
}

function findOwnNode(body) {
	return getNodeName()
		.then((nodeName) => {
			const node = _.find(body, { 
				field : { 
					name: nodeName
				} 
			});
			
			// Calling getNodeName returns a *Promise* therefore, we can simply return here
			// The promise gets created automatically

			if (node) {
				return node;
			} else {
				throw Error('Can not find node');
			}
		});
}

function printResult(dataResult) {

	const IOTA_SINGLE = 0.000001;
	const IOTA_DEC = 1000000;

	const seasonBalance = dataResult.season[0].balance;
	const iotasEarnedByOwnNode = (dataResult.factor * seasonBalance).toFixed(0) * IOTA_SINGLE;	
	const ownNodeFactor = (dataResult.factor * 100).toFixed(2);
	const seasonBalanceFormatted = (seasonBalance / IOTA_DEC).toFixed(2);
	const iotasEarned = ((dataResult.factor*seasonBalance).toFixed(0) / IOTA_DEC).toFixed(2);
	const moneyEarned = (iotasEarnedByOwnNode * dataResult.iotaPrice).toFixed(2);
	// ---------------------
	const ownNodesFactorSum = (dataResult.factorSum * 100).toFixed(2);
	const iotasEarnedByOwnNodesSum = (dataResult.factorSum * seasonBalance).toFixed(0) * IOTA_SINGLE;
	const iotasEarnedSum = ((dataResult.factorSum*seasonBalance).toFixed(0) / IOTA_DEC).toFixed(2);
	const moneyEarnedSum = (iotasEarnedByOwnNodesSum * dataResult.iotaPrice).toFixed(2);
	
	console.log(`-------------------------single node------------------------------`);
	console.log(`field nodes online:\t${dataResult.nodes.length}`);
	
	console.log(`field node:\t\t${dataResult.ownNode.field.name}`);
	console.log(`publicId:\t\t${dataResult.ownNode.field.publicId}`);

	console.log(`score:\t\t\t${dataResult.ownNodeScore}/${dataResult.allNodesScore} (${ownNodeFactor}%)`);
	console.log(`rank:\t\t\t${dataResult.rankNr}`);
	console.log(`season balance:\t\t${seasonBalanceFormatted} MIOTA`);
	console.log(`iotas sponsored:\t${iotasEarned} MIOTA (${moneyEarned}$)`);
	if(nodePublicIds.length > 0) {
		console.log(`-------------------------all nodes--------------------------------`);	
		console.log(`score:\t\t\t${dataResult.scoreSum}/${dataResult.allNodesScore} (${ownNodesFactorSum}%)`);
		console.log(`iotas sponsored:\t${iotasEarnedSum} MIOTA (${moneyEarnedSum}$)`);
	}
	console.log(`------------------------------------------------------------------`);
}

const dataResult = {};

return requestGraph()
	.then(nodes => { 
		dataResult.nodes = nodes; 
		return findOwnNode(nodes) 
	})
	.then(ownNode => { 
		dataResult.ownNode = ownNode;
		return getNodeScore(ownNode) 
	})
	.then(Score => {
		dataResult.ownNodeScore = Score;
		return getNodeRank(dataResult.nodes, dataResult.ownNodeScore);
	})
	.then(rankNr => {
		dataResult.rankNr = rankNr;
		return getallNodesScore(dataResult.nodes);
	})
	.then((allNodesScore) => {
		dataResult.allNodesScore = allNodesScore;
		dataResult.factor = dataResult.ownNodeScore / dataResult.allNodesScore;
		return requestIotaPrice();
	})
	.then((iotaPrice) => {
		dataResult.iotaPrice = iotaPrice;
		return getOwnNodesScoreSum(dataResult.nodes, nodePublicIds);
	})
	.then((scoreSum) => {
		dataResult.scoreSum = scoreSum;
		dataResult.factorSum = dataResult.scoreSum / dataResult.allNodesScore;
		return requestCarriotaSeason();
	})
	.then((season) => {
		dataResult.season = season;
		return printResult(dataResult);
	})
	.catch((error) => {
		console.log(error.message);
	});	
