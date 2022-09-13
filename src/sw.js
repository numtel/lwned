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
  if(path && path[1] === 'loan') {
    const loan = await browser.methods.single(path[2]).call();
    return new Response(htmlHeader() + await loanDetails(loan), {
      headers: { 'Content-Type': 'text/html' }
    });
  } else if(path && path[1] === 'comments') {
    return new Response(htmlHeader(), {
      headers: { 'Content-Type': 'text/html' }
    });
  } else if(path && path[1] === 'account') {
    return new Response(htmlHeader(), {
      headers: { 'Content-Type': 'text/html' }
    });
  } else {
    const views = [
      { label: 'Pending (Query irrelevant)',
        method: 'pending', count: 'pendingCount' },
      { label: 'Active (Query irrelevant)',
        method: 'active', count: 'activeCount' },
      { label: 'By Borrower Account',
        input: 'address',
        method: 'byBorrower', count: 'countOf' },
      { label: 'By Borrower ID Hash',
        input: 'bytes32',
        method: 'byBorrowerIdHash', count: 'countOfIdHash' },
      { label: 'By Lender Account',
        input: 'address',
        method: 'byLender', count: 'countOfLender' },
    ]
    
    let method = url.searchParams.get('method');
    if(!method || views.filter(x => x.method === method).length === 0) method = views[0].method;
    const curView = views.filter(x => x.method === method)[0];

    const viewForm = `
      <form>
        <fieldset>
          <legend>Display Options</legend>
          <select name="method">
            ${views.map(view => `
              <option value="${view.method}" ${view.method === method ? 'selected' :''}>
                ${view.label}
              </option>
            `).join('')}
          </select>
          <label><span>Query:</span>
          <input name="q" value="${htmlEscape(url.searchParams.get('q') || '')}">
          </label>
          <label><span>Start:</span>
          <input name="start" value="${htmlEscape(url.searchParams.get('start') || '0')}">
          </label>
          <label><span>Count:</span>
          <input name="count" value="${htmlEscape(url.searchParams.get('count') || '100')}">
          </label>
          <button>Update</button>
        </fieldset>
      </form>
    `;


    const args = [lwned.options.address];
    const countArgs = [];
    if('input' in curView) {
      args.push(url.searchParams.get('q'));
      countArgs.push(url.searchParams.get('q'));
    }
    const start = Number(url.searchParams.get('start') || 0);
    args.push(start);
    args.push(url.searchParams.get('count') || 100);

    const total = await lwned.methods[curView.count](...countArgs).call()
    const result = await browser.methods[method](...args).call();
    const tokens = await tokenData(result.map(loan => loan.collateralTokens.concat(loan.token)).flat());
    const now = await currentTimestamp();
    const invested = [];
    for(let loan of result) {
      invested.push(await totalSupply(loan.loan));
    }
    const output = htmlHeader() + viewForm + loanTable(result, tokens, invested, start, total, now);
    return new Response(output, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  // XXX unreachable
  return new Response(`<p>Unable to load document</p>`, {
    headers: { 'Content-Type': 'text/html' }
  });
}

async function loanDetails(loan) {
  const tokens = await tokenData(loan.collateralTokens.concat(loan.token));
  const invested = await totalSupply(loan.loan);
  const now = await currentTimestamp();
  return `
    <div class="loan">
      ${loanSpec(loan, tokens, invested, now)}
    </div>
    <div class="loan-text">${userInput(loan.text)}</div>
    <p><a href="/comments/${loan.loan}">Comments: ${loan.commentCount}</a></p>
  `;
}

function loanSpec(loan, tokens, invested, now) {
  return `
    <span class="status-badge ${states[loan.status]}">${states[loan.status]}</span>
    <a class="loan-name" title="Loan Details" href="/loan/${loan.loan}">${loan.name}</a>
    <span class="borrower">Borrower: <a href="/account/${loan.borrower}" title="Borrower Profile">${ellipseAddress(loan.borrower)}</a></span>
    <span class="amount">${loan.status === '0' ? `Raised ${tokens(loan.token, invested, true)} of ` : ''}${tokens(loan.token, loan.amountToGive)}, pays ${new web3.utils.BN(loan.amountToRepay).mul(new web3.utils.BN(10000)).div(new web3.utils.BN(loan.amountToGive)).toNumber() / 100 - 100}%</span>
    ${loan.status !== '0' ? '' : `
    <span class="deadline-issue">Issue by ${new Date(loan.deadlineIssue * 1000).toLocaleString()} (${loan.deadlineIssue > now ? remaining(loan.deadlineIssue - now) : 'Deadline Passed'})</span>`}
    <span class="deadline-repay">Repay by ${new Date(loan.deadlineRepay * 1000).toLocaleString()} (${loan.deadlineRepay > now ? remaining(loan.deadlineRepay - now) : 'Deadline Passed'})</span>
    <span class="collateral">Collateral: ${loan.collateralTokens.map((collateralToken, index) => 
      tokens(collateralToken, loan.collateralAmounts[index])).join(', ')}</span>
  `;
}

function loanTable(data, tokens, invested, start, total, now) {
  return `
    <p class="paging">${start+1}-${start+data.length} of ${total}</p>
    <ol class="loans" start="${start+1}">
      ${data.map((loan, index) => `
        <li class="loan">${loanSpec(loan, tokens, invested[index], now)}</li>
      `).join('')}
    </ol>

  `;
}

function htmlHeader() {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Lwned</title>
        <script src="/deps/web3.min.js"></script>
        <script src="/deps/coinbase.min.js"></script>
        <script src="/deps/web3modal.min.js"></script>
        <script src="/index.js" type="module"></script>
        <link rel="stylesheet" href="/normalize.css">
        <link rel="stylesheet" href="/concrete.css">
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
      <main>
  `;
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
  return function displayToken(tokenAddress, amount, skipSymbol) {
    return (typeof amount !== 'undefined' ?
        applyDecimals(amount, out[tokenAddress].decimals) + ' ' : '') +
      (skipSymbol ? '' : `<a title="View Token on Explorer" href="${explorer(tokenAddress)}">${out[tokenAddress].symbol}</a>`);
  };
}

async function totalSupply(tokenAddress) {
  const token = new web3.eth.Contract(
    await (await fetch('/IERC20.abi')).json(),
    tokenAddress);
  return await token.methods.totalSupply().call();
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

function explorer(address) {
  return config.blockExplorer + '/address/' + address;
}
