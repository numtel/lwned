
const configPromise = (async () => await (await fetch('/config.json')).json())();


async function web3ReadOnly() {
  const config = await configPromise;
  return new Web3(config.rpc);
}

async function wallet() {
  const config = await configPromise;
  const web3Modal = new Web3Modal.default({
    cacheProvider: true,
    providerOptions: {
      coinbasewallet: {
        package: CoinbaseWalletSDK,
        options: {
          appName: 'Lwned',
          rpc: config.rpc,
          chainId: Number(config.chain),
        }
      },
    }
  });
  let provider;
  try {
    provider = await web3Modal.connect();
  } catch(e) {
    console.log("Could not get a wallet connection", e);
    return;
  }
  const web3 = new Web3(provider);
  web3.eth.handleRevert = true;
  const chainId = '0x' + (await web3.eth.getChainId()).toString(16);
  if(chainId !== config.chain) {
    let tryAddChain = false;
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [ { chainId: config.chain } ]
      });
    } catch(error) {
      if(error.message.match(
          /wallet_addEthereumChain|Chain 0x[0-9a-f]+ hasn't been added/)) {
        tryAddChain = true;
      } else {
        alert(error.message);
        return;
      }
    }

    if(tryAddChain) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [ {
            chainId: config.chain,
            chainName: config.chainName,
            nativeCurrency: config.nativeCurrency,
            rpcUrls: [ config.rpc ],
            blockExplorerUrls: [ config.blockExplorer ]
          } ]
        });
      } catch(error) {
        alert(error.message);
        return;
      }
    }
  }
  const accounts = await new Promise((resolve, reject) => {
    web3.eth.getAccounts((error, accounts) => {
      if(error) reject(error);
      else resolve(accounts);
    });
  });
  return {web3, accounts, config};
}

// Turn 1230000 into 1.23
function applyDecimals(input, decimals) {
  decimals = Number(decimals);
  input = String(input);
  if(input === '0') return input;
  while(input.length <= decimals) {
    input = '0' + input;
  }
  const sep = decimalSeparator();
  input = input.slice(0, -decimals) + sep + input.slice(-decimals);
  while(input[input.length - 1] === '0') {
    input = input.slice(0, -1);
  }
  if(input[input.length - 1] === sep) {
    input = input.slice(0, -1);
  }
  return input;
}

// Turn 1.23 into 1230000
function reverseDecimals(input, decimals) {
  decimals = Number(decimals);
  input = String(input);
  if(input === '0') return input;
  const sep = decimalSeparator();
  const sepIndex = input.indexOf(sep);
  if(sepIndex === -1) {
    // Add all digits to end
    input += zeroStr(decimals);
  } else {
    const trailingZeros = decimals - (input.length - sepIndex - 1);
    if(trailingZeros < 0) {
      // Too many decimal places input
      input = input.slice(0, sepIndex) + input.slice(sepIndex + 1, trailingZeros);
    } else {
      // Right pad
      input = input.slice(0, sepIndex) + input.slice(sepIndex + 1) + zeroStr(trailingZeros);
    }
  }
  return input;
}

function zeroStr(length) {
  let str = '';
  while(str.length < length) {
    str += '0';
  }
  return str;
}

// From https://stackoverflow.com/q/2085275
function decimalSeparator() {
  const n = 1.1;
  return n.toLocaleString().substring(1, 2);
}

function ellipseAddress(address) {
  return address.slice(0, 6) + '...' + address.slice(-4);
}

function remaining(seconds) {
  const units = [
    { value: 1, unit: 'second' },
    { value: 60, unit: 'minute' },
    { value: 60 * 60, unit: 'hour' },
    { value: 60 * 60 * 24, unit: 'day' },
  ];
  let remaining = seconds;
  let out = [];
  for(let i = units.length - 1; i >= 0;  i--) {
    if(remaining >= units[i].value) {
      const count = Math.floor(remaining / units[i].value);
      out.push(count.toString(10) + ' ' + units[i].unit + (count !== 1 ? 's' : ''));
      remaining = remaining - (count * units[i].value);
    }
  }
  return out.join(', ');
}

const ZERO_ACCOUNT = '0x0000000000000000000000000000000000000000';

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
}
