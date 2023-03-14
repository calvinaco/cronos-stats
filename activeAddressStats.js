const axios = require("axios");
const BigNumber = require("bignumber.js");

const JSON_RPC_URL = "https://evm.cronos.org";
const START_HEIGHT = "7365650";
const END_HEIGHT = "7380923";

(async () => {
  let result = {
    totalTx: 0,
    uniqueAddr: {},
    uniqueSendAddr: {},
    uniqueRecvAddr: {},
  };
  try {
    for (
      let height = new BigNumber(START_HEIGHT);
      height.isLessThanOrEqualTo(END_HEIGHT);
      height = height.plus(1)
    ) {
      if (height.dividedBy(10).isInteger()) {
        console.log(`Checking block ${height.toString(10)}`);
      }

      let resp;
      while (true) {
        try {
          resp = await axios.post(JSON_RPC_URL, {
            jsonrpc: "2.0",
            method: "eth_getBlockByNumber",
            params: [`0x${height.toString(16)}`, true],
            id: 1,
          });
          break;
        } catch (err) {
          console.log(`${err.message} - retrying...`);
        }
      }
      for (const transaction of resp.data.result.transactions) {
        const { from, to } = transaction;

        result.totalTx += 1;
        result.uniqueAddr[from] = true;
        result.uniqueAddr[to] = true;
        result.uniqueSendAddr[from] = true;
        result.uniqueRecvAddr[to] = true;
      }
    }
  } catch (err) {
    console.log(err);
  } finally {
    console.log(`Total Tx: ${result.totalTx}`);
    console.log(`Active Address: ${Object.keys(result.uniqueAddr).length}`);
    console.log(
      `Unique Send Count: ${Object.keys(result.uniqueSendAddr).length}`
    );
    console.log(
      `Unique Receive Count: ${Object.keys(result.uniqueRecvAddr).length}`
    );
  }
})();
