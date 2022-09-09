const fs = require('fs');
const Web3 = require('web3');
const ganache = require('ganache');
const HTMLServer = require('./HTMLServer');

const devSeed = require('../dev-seed.json');

const PORT = 8545;
const BUILD_DIR = 'build/';
const PUBLIC_DIR = 'public/';
const GAS_AMOUNT = 20000000;
const PROMPT = '> ';
const SECONDS_PER_DAY = 60 * 60 * 24;
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365;

const currentTimestamp = (returnDay) =>
  Math.floor(Date.now() / (1000 * (returnDay ? SECONDS_PER_DAY : 1)));

const ganacheServer = ganache.server({
  wallet: { mnemonic: devSeed.seed },
  logging: { quiet: false },
});
ganacheServer.listen(PORT, async err => {
  if (err) throw err;
  console.log(`Ganache listening on port ${PORT}...`);
  await deployContracts();
});
const web3 = new Web3(ganacheServer.provider);

const contracts = {
  MockVerification: {},
  Lwned: {},
  LwnedBrowser: {},
  LwnedFrontendPending: { constructorArgs: [
    () => contracts.Lwned.instance.options.address,
    () => contracts.LwnedBrowser.instance.options.address,
  ]},
  LwnedFrontendIndex: { constructorArgs: [
    () => contracts.Lwned.instance.options.address,
    () => contracts.LwnedFrontendPending.instance.options.address,
  ]},
};

const commands = {
  help: async function() {
    for(let cur of Object.keys(commands)) {
      const argsString = commands[cur].toString()
        .match(/^async function\(([^\)]+)?/)[1];
      let args = [];
      if(argsString) {
        args = argsString
          .split(',')
          .map(arg => `[${arg.trim()}]`);
      }
      console.log(cur, args.join(' '));
    }
    console.log('\nNOTE: can use account index in verify/mintToken/expiration calls');
  },
  accounts: async function() {
    console.log(accounts.map((acct, i) => `${i}: ${acct}`).join('\n'));
  },
  deployToken: async function() {
    const contractName = 'MockERC20';
    console.log(`Deploying ${contractName}...`);
    const bytecode = fs.readFileSync(`${BUILD_DIR}${contractName}.bin`, { encoding: 'utf8' });
    const abi = JSON.parse(fs.readFileSync(`${BUILD_DIR}${contractName}.abi`, { encoding: 'utf8' }));
    const newContract = new web3.eth.Contract(abi);
    const deployed = await newContract.deploy({
      data: bytecode
    }).send({ from: accounts[0], gas: GAS_AMOUNT });
    console.log('New token:', deployed.options.address);
  },
  mintToken: async function(tokenAddress, accountAddress, amount) {
    if(arguments.length < 3) return console.log('3 arguments required');
    if(tokenAddress.length !== 42) return console.log('Token address required');
    if(accountAddress.length !== 42) accountAddress = accounts[accountAddress];
    if(!accountAddress) return console.log('Account address required');
    if(isNaN(amount) || amount < 1) return console.log('Non-zero amount required');
    const contractName = 'MockERC20';
    const abi = JSON.parse(fs.readFileSync(`${BUILD_DIR}${contractName}.abi`, { encoding: 'utf8' }));
    const token = new web3.eth.Contract(abi, tokenAddress);
    await token.methods.mint(
      accountAddress, amount
    ).send({ from: accounts[0], gas: GAS_AMOUNT });
    console.log('New Balance:', await token.methods.balanceOf(accountAddress).call());
  },
  verify: async function(address, expiration) {
    if(arguments.length === 0) return console.log('Address required');
    if(address.length !== 42) address = accounts[address];
    if(!address) return console.log('Address required');
    if(arguments.length === 1) expiration = 0;
    if(isNaN(expiration)) return console.log('Invalid expiration');
    await contracts.MockVerification.instance.methods.setStatus(
        address, expiration)
      .send({ from: accounts[0], gas: GAS_AMOUNT });
  },
  expiration: async function(address) {
    if(arguments.length === 0) return console.log('Address required');
    if(address.length !== 42) address = accounts[address];
    if(!address) return console.log('Address required');
    console.log(await
      contracts.MockVerification.instance.methods.addressExpiration(address).call());
  },
  nextday: async function() {
    await new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        id: Date.now(),
        params: [SECONDS_PER_DAY],
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
    });
  },
};
let accounts = [];

process.stdin.on('readable', async () => {
  let chunk;
  while (null !== (chunk = process.stdin.read())) {
    const argv = chunk.toString('utf8').trim().split(' ');
    if(argv[0] in commands) {
      await commands[argv[0]].apply(null, argv.slice(1));
    } else {
      console.log('Invalid command', argv[0]);
    }
    process.stdout.write(PROMPT);
  }
});

async function deployContracts() {
  accounts = await ganacheServer.provider.request({
    method: "eth_accounts",
    params: []
  });
  for(let contractName of Object.keys(contracts)) {
    console.log(`Deploying ${contractName}...`);
    const bytecode = fs.readFileSync(`${BUILD_DIR}${contractName}.bin`, { encoding: 'utf8' });
    const abi = JSON.parse(fs.readFileSync(`${BUILD_DIR}${contractName}.abi`, { encoding: 'utf8' }));
    const newContract = new web3.eth.Contract(abi);
    const deployed = await newContract.deploy({
      data: bytecode,
      arguments: 'constructorArgs' in contracts[contractName]
        ? contracts[contractName].constructorArgs.map(arg =>
            typeof arg === 'function' ? arg() : arg)
        : [],
    }).send({ from: accounts[0], gas: GAS_AMOUNT });
    contracts[contractName].instance = deployed;
  }
  // Provide contract addresses to frontend
  fs.writeFileSync(`${BUILD_DIR}config.json`, JSON.stringify({
    rpc: `http://localhost:${PORT}`,
    chain: '0x539',
    chainName: 'Localhost',
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18
    },
    blockExplorer: "https://etherscan.io",
    contracts: Object.keys(contracts).reduce((out, cur) => {
      out[cur] = {
        address: contracts[cur].instance.options.address,
      };
      return out;
    }, {}),
  }));
  console.log('Serving frontend on port', port);
  console.log('Lwned Development Chain CLI\nType "help" for commands, ctrl+c to exit');
  process.stdout.write(PROMPT);
}




// Begin frontend server
function serveFile(filename, rewrite, mime) {
  return {
    ['/' + (rewrite === undefined ? filename : rewrite)]: {
      async GET(req, urlMatch, parsedUrl) {
        return {
          mime: mime ? mime : 'text/html',
          data: fs.readFileSync(PUBLIC_DIR + filename, { encoding: !mime ? 'utf8' : undefined })
        };
      }
    }
  }
}

class DevServer extends HTMLServer {
  constructor() {
    const opt = {
      ...serveFile('index.html', ''),
      ...serveFile('deps/web3.min.js'),
      ...serveFile('deps/coinbase.min.js'),
      ...serveFile('deps/web3modal.min.js'),
      ...serveFile('wallet.js'),
      ...serveFile('style.css'),
      ...serveFile('logo.png', undefined,'image/png'),
      ...serveFile('../build/config.json', 'config.json'),
    };
    super(opt);
  }
}

const app = new DevServer;
const port = process.env.PORT || 3000;
app.listen(port);
