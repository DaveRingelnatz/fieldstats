// MODULE IMPORTS
var request = require("request")
var iniParser = require('parse-ini');

// JSON SOURCES
var urlGraph = "http://field.carriota.com/api/v1/graph";
var urlSeason = "http://field.carriota.com/api/v1/seasons";
var urlMarketcap = "https://api.coinmarketcap.com/v1/ticker/iota/"

// CONFIGURATION
// only change folder, if you are NOT running IRI playbook
var fieldIni = iniParser.parse('/etc/field/field.ini');
// leave empty if you are using iric, else set manually to name of your node
var nodeName = "";

// VARIABLES
var nodesOnline = 0;
var sumPointsOfAllNodes = 0;
var nodeId = -1;
var nodePoints = 0;
var seasonBalance = 0;
var factor = 0;
var iotaPrice = 0;
var iotasEarnedByOwnNode = 0;


function getNodePoints(body, nodeId) {
		// only add points if node is online
        if ((typeof nodeId != "undefined") && nodeId >= 0) {
			
			// count points
			var points = 0;

			// attachToTangle
			if (typeof body[nodeId].workDone.attachToTangle != "undefined") {
				points += body[nodeId].workDone.attachToTangle * 50;
			}

			// broadcastTransactions
			if (typeof body[nodeId].workDone.broadcastTransactions != "undefined") {
				points += body[nodeId].workDone.broadcastTransactions * 5;
			}

			// checkConsistency
			if (typeof body[nodeId].workDone.checkConsistency != "undefined") {
				points += body[nodeId].workDone.checkConsistency * 5;
			}

			// findTransactions
			if (typeof body[nodeId].workDone.findTransactions != "undefined") {
				points += body[nodeId].workDone.findTransactions * 5;
			}

			// getBalances
			if (typeof body[nodeId].workDone.getBalances != "undefined") {
				points += body[nodeId].workDone.getBalances * 3;
			}

			// getInclusionStates
			if (typeof body[nodeId].workDone.getInclusionStates != "undefined") {
				points += body[nodeId].workDone.getInclusionStates * 3;
			}

			// getNodeInfo
			if (typeof body[nodeId].workDone.getNodeInfo != "undefined") {
				points += body[nodeId].workDone.getNodeInfo * 1;
			}

			// getTransactionsToApprove
			if (typeof body[nodeId].workDone.getTransactionsToApprove != "undefined") {
				points += body[nodeId].workDone.getTransactionsToApprove * 3;
			}

			// getTrytes
			if (typeof body[nodeId].workDone.getTrytes != "undefined") {
				points += body[nodeId].workDone.getTrytes * 3;
			}

			// storeTransactions
			if (typeof body[nodeId].workDone.storeTransactions != "undefined") {
				points += body[nodeId].workDone.storeTransactions * 20;
			}

			// wereAddressesSpentFrom
			if (typeof body[nodeId].workDone.wereAddressesSpentFrom != "undefined") {
				points += body[nodeId].workDone.wereAddressesSpentFrom * 5;
			}
			return points;
		}
		else {
			console.log("node not found ... aborting");
			process.exit(1);
		}
	}
	
request({
    url: urlGraph,
    json: true,
}, function(error, response, body) {

    if (!error && response.statusCode === 200) {
        var nodesOnline = body.length;

        // get own node
        for (i = 0; i < nodesOnline; i++) {
            if (nodeName != "") {
				if (body[i].field.name == nodeName) {
					nodeId = i;
				}
            }
			else if (body[i].field.name == fieldIni.field.name) {
                nodeId = i;
            }
        }
		// get points of own node	
        nodePoints = getNodePoints(body, nodeId);
		
		// get points of all online nodes
		sumPointsOfAllNodes = 0;
        for (i = 0; i < nodesOnline; i++) {
			if (typeof body[i].workDone != "undefined") {
				sumPointsOfAllNodes += getNodePoints(body, i);
			}
        }
		factor = (nodePoints/sumPointsOfAllNodes);
		
		// get current IOTA price data
		request({
			url: urlMarketcap,
			json: true,
		}, function(error, response, body) {

			if (!error && response.statusCode === 200) {
				iotaPrice = body[0].price_usd;
				
				// get data of current season
				request({
					url: urlSeason,
					json: true,
				}, function(error, response, body) {

					if (!error && response.statusCode === 200) {
						seasonBalance = body[0].balance;
						iotasEarnedByOwnNode = Number(factor*seasonBalance).toFixed(0) * 0.000001;	

						// OUTPUT DATA
						console.log("--------------------------------------------------------------------");
						console.log("#online field nodes:\t" + nodesOnline);
						if (nodeName != "") {
							console.log("field node:\t\t"+nodeName + " (id: " + nodeId + ")");
						}
						else {
							console.log("field node:\t\t"+fieldIni.field.name + " (id: " + nodeId + ")");
						}
						console.log("#points:\t\t" + nodePoints + "/" + sumPointsOfAllNodes + " (" + Number((nodePoints/sumPointsOfAllNodes)*100).toFixed(2) + "%)");
						console.log("season balance:\t\t" + Number(seasonBalance/1000000).toFixed(2) + " MIOTA");
						console.log("iotas earned:\t\t" + Number(Number(factor*seasonBalance).toFixed(0)/1000000).toFixed(2) + " MIOTA (" + Number(iotasEarnedByOwnNode * iotaPrice).toFixed(2) + "$)");
						console.log("--------------------------------------------------------------------");	
						// OUTPUT DATA						
					}
				})
			}
		})	
    }
})
