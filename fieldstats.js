// MODULE IMPORTS
const request = require("request")
const iniParser = require('parse-ini');
const fs = require('fs');
const _ = require('lodash');

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

// CONFIGURATION
// only change folder, if you are NOT running IRI playbook
const fieldIniUrl = '/etc/field/field.ini';
const nodeName = "";


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

function calculatePoints(workSet, key) {
	if (!workSet[key]) {
		return 0;
	}

	const points = workSet[key] * multiplicators[key];

	return points;
}

function getNodePoints(node) {
	// only add points if node is online

	let points = 0;

	/**
	 * As we have defined the multiplicators in a list
	 * We can simply iterate through every key
	 * If the node has done work for the specific key
	 * It gets calculated. Otherwise 0 is added.
	 */
	
	Object.keys(multiplicators)
		.forEach(key => {
			points += calculatePoints(node.workDone, key);
		});

	return points;
}

function getAllNodePoints(nodes) {
	let points = 0;
	
	nodes.forEach((node) => {
		points += getNodePoints(node);
	});

	return points;
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

	/**
	 * You may want to work on this 
	 */

	const IOTA_SINGLE = 0.000001;
	const IOTA_DEC = 1000000;

	const seasonBalance = dataResult.season[0].balance;
	const iotasEarnedByOwnNode = (dataResult.factor * seasonBalance).toFixed(0) * IOTA_SINGLE;	
	const fixedFactor = (dataResult.factor * 100).toFixed(2);
	const seasonBalanceFormatted = (seasonBalance / IOTA_DEC).toFixed(2);
	const iotasEarned = ((dataResult.factor*seasonBalance).toFixed(0) / IOTA_DEC).toFixed(2);
	const moneyEarned = (iotasEarnedByOwnNode * dataResult.iotaPrice).toFixed(2);

	console.log(dataResult.iotaPrice);

	console.log(`--------------------------------------------------------------------`);
	console.log(`#online field nodes:\t${dataResult.nodes.length}`);
	
	console.log(`field node:\t\t${dataResult.ownNode.field.name}`);

	console.log(`#points:\t\t${dataResult.ownNodePoints}/${dataResult.allNodePoints} (${fixedFactor}%)`);
	console.log(`season balance:\t\t${seasonBalanceFormatted} MIOTA`);
	console.log(`iotas earned:\t\t${iotasEarned} MIOTA (${moneyEarned}$)`);
	console.log(`--------------------------------------------------------------------`);	
}

const dataResult = {};

return requestGraph()
	.then(nodes => { 
		dataResult.nodes = nodes; 
		return findOwnNode(nodes) 
	})
	.then(ownNode => { 
		dataResult.ownNode = ownNode;
		return getNodePoints(ownNode) 
	})
	.then(points => {
		dataResult.ownNodePoints = points;
		return getAllNodePoints(dataResult.nodes);
	})
	.then((points) => {
		dataResult.allNodePoints = points;
		dataResult.factor = dataResult.ownNodePoints / dataResult.allNodePoints;
		return requestIotaPrice();
	})
	.then((iotaPrice) => {
		dataResult.iotaPrice = iotaPrice;
		return requestCarriotaSeason();
	})
	.then((season) => {
		dataResult.season = season;
		return printResult(dataResult);
	})
	.catch((error) => {
		console.log(error.message);
	});	
