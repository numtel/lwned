import {
  wallet,
  applyDecimals,
  reverseDecimals,
  ellipseAddress,
} from './wallet.js';

let web3, web3Modal, accounts, config;

window.addEventListener('load', async function() {
  const walletEl = document.getElementById('wallet-status');
  if(localStorage.getItem("WEB3_CONNECT_CACHED_PROVIDER")) {
    await connect();
  } else {
    walletEl.innerHTML = `<button onclick="connect()" title="Connect Wallet">Connect Wallet</button>`;
  }

  if(accounts) {
    document.querySelectorAll('[data-my-balance]').forEach(async span => {
      const token = await erc20(span.getAttribute('data-my-balance'));
      span.innerHTML = 'My Balance: ' + applyDecimals(
        await token.methods.balanceOf(accounts[0]).call(),
        await token.methods.decimals().call());
    });
  }

  document.querySelectorAll('.loan-actions').forEach(async el => {
    const borrower = el.getAttribute('data-borrower');
    if(!accounts || borrower.toLowerCase() !== accounts[0].toLowerCase()) {
      el.querySelectorAll('button').forEach(button => button.setAttribute('disabled', ''));
    }
  });
});

window.connect = async function() {
  const result = await wallet();
  web3 = result.web3;
  web3Modal = result.web3Modal;
  accounts = result.accounts;
  config = result.config;
  const walletEl = document.getElementById('wallet-status');
  walletEl.innerHTML = `<button onclick="disconnect()" title="Disconnect Wallet">Connected as ${ellipseAddress(accounts[0])}</button>`;
}

window.disconnect = async function() {
  await web3Modal.clearCachedProvider();
  window.location.reload();
}

async function erc20(address) {
  return new web3.eth.Contract(await (await fetch('/IERC20.abi')).json(), address);
}

window.submitNewLoanForm = async function(form) {
  if(!web3) await connect();
  const factory = new web3.eth.Contract(
    await (await fetch('/ILwned.abi')).json(),
    config.contracts.Lwned.address);
  const loanToken = await erc20(form.querySelector('input[name="token"]').value);
  const tokenDecimals = await loanToken.methods.decimals().call();
  const collateralTokens = Array.from(form.querySelectorAll('.collateral input'))
    .map((el, index) => index % 2 === 0 ? el.value : undefined)
    .filter(x => typeof x !== 'undefined');
  const collateralAmounts = Array.from(form.querySelectorAll('.collateral input'))
    .map((el, index) => index % 2 === 1 ? el.value : undefined)
    .filter(x => typeof x !== 'undefined');
  // Approve collateral to factory
  for(let i = 0; i<collateralTokens.length; i++) {
    const token = await erc20(collateralTokens[i]);
    collateralAmounts[i] = reverseDecimals(collateralAmounts[i], await token.methods.decimals().call());
    await token.methods.approve(factory.options.address, collateralAmounts[i]).send({from:accounts[0]});
  }
  // Process loan application
  const result = await factory.methods.newApplication(
    form.querySelector('#token').value,
    reverseDecimals(form.querySelector('input[name="toGive"]').value, tokenDecimals),
    reverseDecimals(form.querySelector('input[name="toRepay"]').value, tokenDecimals),
    Math.floor((new Date(form.querySelector('input[name="deadlineIssueDate"]').value + ' ' +
      form.querySelector('input[name="deadlineIssueTime"]').value)).getTime()/1000),
    Math.floor((new Date(form.querySelector('input[name="deadlineRepayDate"]').value + ' ' +
      form.querySelector('input[name="deadlineRepayTime"]').value)).getTime()/1000),
    collateralTokens, collateralAmounts,
    form.querySelector('textarea').value,
    form.querySelector('#loan-name').value,
  ).send({from: accounts[0]});
  window.location='/loan/' + result.events.NewApplication.returnValues.loan;
}
window.setToken = async function(el) {
  el.nextElementSibling.innerHTML = 'Loading...';
  try {
    const token = await erc20(el.value);
    const tokenName = await token.methods.name().call();
    const decimals = await token.methods.decimals().call();
    const balance = await token.methods.balanceOf(accounts[0]).call();
    el.nextElementSibling.setAttribute('data-balance', balance);
    el.nextElementSibling.setAttribute('data-decimals', decimals);
    el.nextElementSibling.innerHTML = tokenName + ', Balance: ' + applyDecimals(balance, decimals);
  } catch(error) {
    console.error(error);
    el.nextElementSibling.innerHTML = 'Error reading ERC20 name!';
  }
}
window.addCollateral = async function(el) {
  const div = document.createElement('div');
  div.classList.toggle('collateral-item', true);
  div.innerHTML = '<div>Token: <input name="token" required match="^0x[a-fA-F0-9]{40}$" onchange="setToken(this)"><span></span><div class="common">' + document.querySelector('.common').innerHTML + '</div></div><div>Amount: <input required><div class="common"><button type="button" onclick="removeCollateral(this)">Remove</button></div>';
  el.parentNode.appendChild(div);
}
window.removeCollateral = function(button) {
  button.closest('.collateral').removeChild(button.closest('.collateral-item'))
}

window.loanInvest = async function(form) {
  if(!web3) await connect();
  const loan = new web3.eth.Contract(
    await (await fetch('/ILoan.abi')).json(),
    form.getAttribute('data-loan'));
  const loanToken = await erc20(form.getAttribute('data-token'));
  const tokenDecimals = await loanToken.methods.decimals().call();
  // Approve spend to loan
  const amount = reverseDecimals(form.querySelector('input').value, await loanToken.methods.decimals().call());
  await loanToken.methods.approve(loan.options.address, amount).send({from:accounts[0]});
  await loan.methods.invest(amount).send({from: accounts[0]});
  window.location.reload();
}

window.loanDivest = async function(form) {
  if(!web3) await connect();
  const loan = new web3.eth.Contract(
    await (await fetch('/ILoan.abi')).json(),
    form.getAttribute('data-loan'));
  const loanToken = await erc20(form.getAttribute('data-token'));
  const tokenDecimals = await loanToken.methods.decimals().call();
  const amount = reverseDecimals(form.querySelector('input').value, await loanToken.methods.decimals().call());
  await loan.methods.divest(amount).send({from: accounts[0]});
  window.location.reload();
}

window.loanIssue = async function(loanAddr) {
  if(!web3) await connect();
  const loan = new web3.eth.Contract(await (await fetch('/ILoan.abi')).json(), loanAddr);
  await loan.methods.loanIssue().send({from: accounts[0]});
  window.location.reload();
}

window.loanCancel = async function(loanAddr) {
  if(!web3) await connect();
  const loan = new web3.eth.Contract(await (await fetch('/ILoan.abi')).json(), loanAddr);
  await loan.methods.loanCancel().send({from: accounts[0]});
  window.location.reload();
}

window.loanRepay = async function(loanAddr, token, amount) {
  if(!web3) await connect();
  const loan = new web3.eth.Contract(await (await fetch('/ILoan.abi')).json(), loanAddr);
  const loanToken = await erc20(token);
  const tokenDecimals = await loanToken.methods.decimals().call();
  // Approve spend to loan
  await loanToken.methods.approve(loanAddr, amount).send({from:accounts[0]});
  await loan.methods.loanRepay().send({from: accounts[0]});
  window.location.reload();
}

window.postComment = async function(form) {
  if(!web3) await connect();
  const browser = new web3.eth.Contract(
    await (await fetch('/ILwnedBrowser.abi')).json(),
    config.contracts.LwnedBrowser.address);
  await browser.methods.postComment(
    form.getAttribute('data-loan'),
    form.querySelector('textarea').value
  ).send({from: accounts[0]});
  window.location.reload();
}
