const window = {};
importScripts('/deps/web3.min.js');
const Web3 = window.Web3;

let config, web3;

const hostable = [
  'style.css',
  'concrete.css',
  'normalize.css',
  'wallet.js',
  'index.js',
  'sw.js',
  'lwned.png',
  'config.json',
  'deps/coinbase.min.js',
  'deps/web3.min.js',
  'deps/web3modal.min.js',
  'ILwned.abi',
  'ILwnedBrowser.abi',
  'IVerification.abi',
  'ILensHub.abi',
  'ILoan.abi',
  'IERC20.abi',
];
importScripts('/pages/loan.js');
importScripts('/pages/account.js');
importScripts('/pages/comments.js');
importScripts('/pages/apply.js');
importScripts('/pages/header.js');

const states = ['Pending', 'Active', 'Repaid', 'Defaulted', 'Canceled'];

self.addEventListener('fetch', (event) => {
  event.respondWith(loader(event.request));
});

const currentTimestamp = async () => (await web3.eth.getBlock('latest')).timestamp;

async function loader(request) {
  config = await (await fetch('/config.json')).json();
  if(!request.url.startsWith(config.root)) return fetch(request);
  const url = new URL(request.url);
  if(hostable.indexOf(url.pathname.slice(1)) !== -1) return fetch(request);
  web3 = new Web3(config.rpc);

  // Load individual contract instances
  const verification = new web3.eth.Contract(
    await (await fetch('/IVerification.abi')).json(),
    config.contracts.MockVerification.address);
  const lensHub = new web3.eth.Contract(
    await (await fetch('/ILensHub.abi')).json(),
    config.contracts.MockLensHub.address);
  const lwned = new web3.eth.Contract(
    await (await fetch('/ILwned.abi')).json(),
    config.contracts.Lwned.address);
  const browser = new web3.eth.Contract(
    await (await fetch('/ILwnedBrowser.abi')).json(),
    config.contracts.LwnedBrowser.address);

  let path = url.pathname.match(/^\/([^\/]+)\/([\s\S]+)?/);
  let out;
  try {
    if(url.pathname === '/new-loan') {
      out = htmlHeader('Apply for Loan') + applyForm(lwned);
    } else if(path && path[1] === 'loan') {
      const loan = await browser.methods.single(path[2]).call();
      out = htmlHeader(userInput(loan.name)) + await loanDetails(loan, lensHub);
    } else if(path && path[1] === 'comments') {
      const loan = await browser.methods.single(path[2]).call();
      out = htmlHeader('Comments:' + userInput(loan.name)) + await loanComments(loan, url, browser, lensHub);
    } else if(path && path[1] === 'account') {
      out = htmlHeader('Lwned Account Profile') + await accountProfile(path[2], lwned, verification, lensHub);
    } else {
      out = htmlHeader('Lwned') + await loanList(url, lwned, browser, lensHub);
    }
  } catch(error) {
    console.error(error);
    out = htmlHeader('Lwned Error!') + `<p>An error has occurred!</p>`;
  }
  return new Response(out, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// TODO cache for entire page view
async function tokenData(tokenAddresses) {
  const out = {};
  for(let tokenAddress of tokenAddresses) {
    if(tokenAddress in out) continue;
    const token = new web3.eth.Contract(
      await (await fetch('/IERC20.abi')).json(),
      tokenAddress);
    out[tokenAddress] = {
      decimals: await token.methods.decimals().call(),
      symbol: await token.methods.symbol().call(),
    };
  }
  return function displayToken(tokenAddress, amount, skipSymbol, skipLink) {
    let symbol = out[tokenAddress].symbol;
    if(!skipLink) symbol = `<a title="View Token on Explorer" href="${explorer(tokenAddress)}">${symbol}</a>`;
    return (typeof amount !== 'undefined' ?
        applyDecimals(amount, out[tokenAddress].decimals) + ' ' : '') +
      (skipSymbol ? '' : symbol);
  };
}

async function totalSupply(tokenAddress) {
  const token = new web3.eth.Contract(
    await (await fetch('/IERC20.abi')).json(),
    tokenAddress);
  return await token.methods.totalSupply().call();
}

async function decimals(tokenAddress) {
  const token = new web3.eth.Contract(
    await (await fetch('/IERC20.abi')).json(),
    tokenAddress);
  return await token.methods.decimals().call();
}

function userInput(text) {
  const parts = text.split('https://');
  parts[0] = nl2br(parts[0]);
  for(let i = 1; i< parts.length; i+=2) {
    const firstSpace = parts[i].indexOf(' ');
    const url = parts[i].slice(0, firstSpace !== -1 ? firstSpace : parts[i].length);
    const text = parts[i].slice(url.length);
    parts[i] = html`<a href="https://${url}">https://${url}</a>${nl2br(text)}`;
  }
  return parts;
}

function nl2br(text) {
  return htmlEscape(text).split('\n').join('<br />');
}

function htmlEscape(str) {
  return String(str).replace(/&/g, '&amp;') // first!
            .replace(/>/g, '&gt;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;');
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
  return address.slice(0, 6) + '&hellip;' + address.slice(-4);
}

function remaining(seconds, onlyBiggest) {
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
      if(onlyBiggest) return out[0];
      remaining = remaining - (count * units[i].value);
    }
  }
  return out.join(', ');
}

function explorer(address) {
  return config.blockExplorer + '/address/' + address;
}
