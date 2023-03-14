const axios = require("axios");
const BigNumber = require("bignumber.js");
const util = require("@ethereumjs/util");
const Common = require("@ethereumjs/common").Common;
const EthereumTransaction = require("@ethereumjs/tx").Transaction;
const FeeMarketEIP1559Transaction =
  require("@ethereumjs/tx").FeeMarketEIP1559Transaction;

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
          resp = await axios.get(
            `https://rest.cronos.org/cosmos/tx/v1beta1/txs?events=tx.height=${height.toString(
              10
            )}`
          );
          break;
        } catch (err) {
          console.log(`${err.message} - retrying...`);
        }
      }
      for (const txResp of resp.data.tx_responses) {
        if (txResp.code !== 0) {
          continue;
        }
        for (const message of txResp.tx.body.messages) {
          if (txResp.height !== height.toString(10)) {
            continue;
          }

          if (message["@type"] === "/ethermint.evm.v1.MsgEthereumTx") {
            const {
              to,
              data,
              nonce,
              gas_price,
              gas,
              value,
              v,
              r,
              s,
              gas_tip_cap,
              gas_fee_cap,
            } = message.data;
            const type = message.data["@type"];

            let rawTx;
            if (type === "/ethermint.evm.v1.DynamicFeeTx") {
              rawTx = new FeeMarketEIP1559Transaction(
                {
                  nonce: `0x${new BigNumber(nonce).toString(16)}`,
                  maxFeePerGas: `0x${new BigNumber(gas_fee_cap).toString(16)}`,
                  maxPriorityFeePerGas: `0x${new BigNumber(
                    gas_tip_cap
                  ).toString(16)}`,
                  gasLimit: `0x${new BigNumber(gas).toString(16)}`,
                  to,
                  value: `0x${new BigNumber(value).toString(16)}`,
                  data:
                    data === null
                      ? "0x"
                      : `0x${Buffer.from(data, "base64").toString("hex")}`,
                  chainId: 25,
                  v:
                    v === null ? 0 : util.bufferToInt(Buffer.from(v, "base64")),
                  r: `0x${Buffer.from(r, "base64").toString("hex")}`,
                  s: `0x${Buffer.from(s, "base64").toString("hex")}`,
                },
                {
                  common: Common.custom({ chainId: 25 }),
                }
              );
            } else {
              rawTx = new EthereumTransaction(
                {
                  nonce: `0x${new BigNumber(nonce).toString(16)}`,
                  gasPrice: `0x${new BigNumber(gas_price).toString(16)}`,
                  gasLimit: `0x${new BigNumber(gas).toString(16)}`,
                  to,
                  value: `0x${new BigNumber(value).toString(16)}`,
                  data:
                    data === null
                      ? "0x"
                      : `0x${Buffer.from(data, "base64").toString("hex")}`,
                  v: util.bufferToInt(Buffer.from(v, "base64")),
                  r: `0x${Buffer.from(r, "base64").toString("hex")}`,
                  s: `0x${Buffer.from(s, "base64").toString("hex")}`,
                },
                {
                  common: Common.custom({ chainId: 25 }),
                }
              );
            }
            // const pubKey = util.ecrecover(
            //   rawTx.hash(false),
            //   v === null ? 0 : util.bufferToInt(Buffer.from(v, "base64")),
            //   Buffer.from(r, "base64"),
            //   Buffer.from(s, "base64"),
            //   25
            // );
            // const fromAddress = util.Address.fromPublicKey(pubKey).toString();
            const fromAddress = rawTx.getSenderAddress();

            result.totalTx += 1;
            result.uniqueAddr[fromAddress] = true;
            result.uniqueAddr[to] = true;
            result.uniqueSendAddr[fromAddress] = true;
            result.uniqueRecvAddr[to] = true;

            // console.log(`Height: ${height}`);
            // console.log(`TxHash: ${message.hash}`);
            // console.log(`From: ${fromAddress}`);
            // console.log(`To: ${to}`);
            // console.log(`Nonce: ${nonce}`);
            // console.log(`Value: ${value}`);
            // console.log(`Is CRC20?: ${decodedERC20 === null ? "No" : "Yes"}`);
            // console.log(
            //   `Cosmos Tx: ${JSON.stringify(message)}\n${JSON.stringify(
            //     decodedERC20
            //   )}
            //   `
            // );
            // console.log();
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
  } finally {
    console.log(`Total Tx: ${result.totalTx}`);
    console.log(
      `Unique Send Count: ${Object.keys(result.uniqueSendAddr).length}`
    );
    console.log(
      `Unique Recv Count: ${Object.keys(result.uniqueRecvAddr).length}`
    );
  }
})();
