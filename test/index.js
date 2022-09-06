const Web3 = require('web3');
const ganache = require('ganache');
const fs = require('fs');

const web3 = new Web3(ganache.provider({ logging: { quiet: true } }));
web3.eth.handleRevert = true;

const BUILD_DIR = 'build/';
const GAS_AMOUNT = 20000000;
const BURN_ACCOUNT = '0x0000000000000000000000000000000000000000';

function increaseTime(seconds) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      id: Date.now(),
      params: [seconds],
    }, (err, res) => {
      if(err) return reject(err);
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: Date.now(),
      }, (err, res) => {
        if(err) return reject(err)
        resolve(res)
      });
    });
  })
}

async function loadContract(contractName, address) {
  const abi = JSON.parse(fs.readFileSync(
    `${BUILD_DIR}${contractName}.abi`, { encoding: 'utf8' }));
  const deployed = new web3.eth.Contract(abi, address);
  deployed.sendFrom = (address) => Object.keys(deployed.methods)
    .reduce((out, cur) => {
      out[cur] = function() {
        return deployed.methods[cur].apply(null, arguments)
          .send({ from: address, gas: GAS_AMOUNT });
      }
      return out;
    }, {});

  return deployed;
}

async function deployContract(account, contractName, ...args) {
  const bytecode = fs.readFileSync(
    `${BUILD_DIR}${contractName}.bin`, { encoding: 'utf8' });
  const abi = JSON.parse(fs.readFileSync(
    `${BUILD_DIR}${contractName}.abi`, { encoding: 'utf8' }));
  const contract = new web3.eth.Contract(abi);
  const method = contract.deploy({ data: bytecode, arguments: args });
  const gas = await method.estimateGas();
  const deployed = await method.send({ from: account, gas: GAS_AMOUNT });

  deployed.sendFrom = (address) => Object.keys(deployed.methods)
    .reduce((out, cur) => {
      out[cur] = function() {
        return deployed.methods[cur].apply(null, arguments)
          .send({ from: address, gas: GAS_AMOUNT });
      }
      return out;
    }, {});

  return deployed;
}

async function throws(asyncFun) {
  let hadError;
  try {
    await asyncFun();
  } catch(error) {
    hadError = true;
  }
  return hadError;
}

const cases = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.test.js'))
  .reduce((out, caseFile) => {
    out[caseFile.slice(0, -8)] = require(`./${caseFile}`);
    return out;
  }, {});

(async function() {
  const accounts = await new Promise((resolve, reject) => {
    web3.eth.getAccounts((error, accounts) => {
      if(error) reject(error);
      else resolve(accounts);
    });
  });

  // Run the test cases!
  let passCount = 0, failCount = 0; totalCount = 0;
  console.time('All Tests');
  for(let fileName of Object.keys(cases)) {
    const theseCases = cases[fileName];
    if(process.argv.length > 2 && fileName !== process.argv[2]) continue;
    for(let caseName of Object.keys(theseCases)) {
      if(process.argv.length > 3 && caseName !== process.argv[3]) continue;
      totalCount++;
      let failed = false;
      const caseTimerName = `  ${fileName} ${caseName}`;
      console.time(caseTimerName);
      try {
        await theseCases[caseName]({
          // Supply test context as options object in first argument to case
          web3, accounts, increaseTime, deployContract, loadContract, BURN_ACCOUNT,
          throws,
        });
      } catch(error) {
        console.error(error);
        failed = true;
      }
      if(!failed) {
        console.log('PASS');
        passCount++;
      } else {
        console.log('FAILURE');
        failCount++;
      }
      console.timeEnd(caseTimerName);
    }
  }
  console.log(`${passCount} passed, ${failCount} failed of ${totalCount} tests`);
  console.timeEnd('All Tests');
  if(failCount > 0) process.exit(1);
})();
