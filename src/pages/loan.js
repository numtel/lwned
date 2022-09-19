
async function loanDetails(loan, lensHub, verification) {
  const tokens = await tokenData(loan.collateralTokens.concat(loan.token));
  const invested = await totalSupply(loan.loan);
  const loanDecimals = await decimals(loan.loan);
  const maxInvest = applyDecimals(new web3.utils.BN(loan.amountToGive).sub(new web3.utils.BN(invested)).toString(), loanDecimals);
  const now = await currentTimestamp();
  // loan argument is web3.js immutable result
  const status = actualStatus(loan, now);
  return `
    <div class="loan">
      ${await loanSpec(loan, tokens, invested, lensHub, verification, status, now, true)}
    </div>
    <section class="loan-text">${userInput(loan.text)}</section>
    ${status === '0' ? `
      <p class="loan-actions" data-borrower="${loan.borrower}">
        ${maxInvest === '0' ? `<button onclick="loanIssue('${loan.loan}')">Issue</button>` : ''}
        <button onclick="loanCancel('${loan.loan}')">Cancel</button>
      </p>
      ${investForm(loan, maxInvest) + divestForm(loan)}
    ` : status === '1' ? `
      <p class="loan-actions">
        <button onclick="loanRepay('${loan.loan}', '${loan.token}', '${loan.amountToRepay}')">Repay ${tokens(loan.token, loan.amountToRepay, false, true)}</button>
        <span data-my-balance="${loan.token}"></span>
      </p>
    ` : status === '4' || status === '2' || status === '3' ? `
      ${divestForm(loan)}
    ` : ''}
  `;
}

function actualStatus(loan, now) {
  return (
    // defacto defaulted
    (loan.deadlineRepay < now && loan.status === '1') ? '3' :
    // defacto canceled
    (loan.deadlineIssue < now && loan.status === '0') ? '4' :
    // no modification required
    loan.status);
}

async function loanSpec(loan, tokens, invested, lensHub, verification, status, now, detailed) {
  const fullRepayPercent = Math.floor(new web3.utils.BN(loan.amountToRepay).mul(new web3.utils.BN(10000)).div(new web3.utils.BN(loan.amountToGive)).toNumber()) / 100;
  const repayTime = loan.deadlineRepay > now ? ` within <time datetime="${new Date(loan.deadlineRepay * 1000).toJSON()}" title="${new Date(loan.deadlineRepay * 1000).toLocaleString()}">${remaining(loan.deadlineRepay - now, !detailed)}</time>` : '';
  const issueTime = loan.deadlineIssue > now ? ` within <time datetime="${new Date(loan.deadlineIssue * 1000).toJSON()}" title="${new Date(loan.deadlineIssue * 1000).toLocaleString()}">${remaining(loan.deadlineIssue - now, !detailed)}</time>` : '';
  const lensProfileId = await lensHub.methods.defaultProfile(loan.borrower).call();
  let lensProfile;
  if(lensProfileId !== '0') {
    lensProfile = await lensHub.methods.getProfile(lensProfileId).call();
  }
  const cpValid = await verification.methods.addressActive(loan.borrower).call();

  return `
    <h2>
    <span class="status-badge ${states[status]}">${states[status]}</span>
    <a class="loan-name" title="Loan Details" href="/loan/${loan.loan}">${loan.name}</a>
    </h2>
    <span class="borrower">Borrower: <a href="/account/${loan.borrower}" title="Borrower Profile">${lensProfile ? `
        <img alt="${lensProfile.handle} avatar" class="avatar" src="https://ik.imagekit.io/lensterimg/tr:n-avatar,tr:di-placeholder.webp/https://lens.infura-ipfs.io/ipfs/${lensProfile.imageURI.slice(7)}">
        ${lensProfile.handle}
      ` : ellipseAddress(loan.borrower)}</a>${cpValid ? '<span class="passport-badge" title="Passport Verified">Passport Verified</span>' : ''}</span>
    <span class="amount">${status === '0' ? `Looking to raise ${tokens(loan.token, new web3.utils.BN(loan.amountToGive).sub(new web3.utils.BN(invested)).toString(), true)} of ` : status === '4' ? 'Did not raise ' : ''}${tokens(loan.token, loan.amountToGive)}${status === '0' ? `${issueTime}, will repay ${fullRepayPercent}%${repayTime}` : status === '1' ? `, waiting for repay of ${fullRepayPercent}%${repayTime}` : status === '2' ? `, repaid ${fullRepayPercent}%` : ''}</span>
    <span class="collateral">Collateral: ${loan.collateralTokens.length ? loan.collateralTokens.map((collateralToken, index) => 
      tokens(collateralToken, loan.collateralAmounts[index])).join(', ') : 'None'}</span>
    <p><a href="/comments/${loan.loan}">Comments: ${loan.commentCount}</a></p>
  `;
}


function investForm(loan, maxInvest) {
  if(maxInvest === '0') return '';
  return `
    <form onsubmit="loanInvest(this); return false" data-loan="${loan.loan}" data-token="${loan.token}">
      <fieldset><legend>Invest</legend>
      <div class="row">
      <label for="invest-amount">Amount <span data-my-balance="${loan.token}"></span></label>
      <input id="invest-amount" type="number" required min="0" max="${maxInvest}">
      </div>
      <button>Submit</button>
      </fieldset>
    </form>
  `;
}

function divestForm(loan) {
  return `
    <form onsubmit="loanDivest(this); return false" data-loan="${loan.loan}" data-token="${loan.token}">
      <fieldset><legend>Divest${loan.status == "2" ? ` from repayment of ${Math.floor(new web3.utils.BN(loan.amountToRepay).mul(new web3.utils.BN(10000)).div(new web3.utils.BN(loan.amountToGive)).toNumber()) / 100}%` : loan.status == "3" ? ` from collateral` : ''}</legend>
      <div class="row">
      <label for="divest-amount">Amount <span data-my-balance="${loan.loan}"></span></label>
      <input id="divest-amount" type="number" required min="0">
      </div>
      <button>Submit</button>
      </fieldset>
    </form>
  `;
}

async function loanTable(data, tokens, invested, lensHub, verification, start, total, now) {
  let loanHTML = '';
  for(let index = 0; index<data.length; index++) {
    loanHTML += `
      <li class="loan">${await loanSpec(data[index], tokens, invested[index], lensHub, verification, actualStatus(data[index], now), now)}</li>
    `;
  }
  return `
    <p class="paging">${start+1}-${start+data.length} of ${total}</p>
    <ol class="loans" start="${start+1}">
      ${loanHTML}
    </ol>

  `;
}

async function loanList(url, lwned, browser, lensHub, verification) {
  const views = [
    { label: 'Pending (Query irrelevant)',
      method: 'pending', count: 'pendingCount' },
    { label: 'Pending with verified passport (Query irrelevant)',
      method: 'pendingWithIdHash', count: 'pendingCountWithIdHash' },
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
    { label: 'By Token',
      input: 'address',
      method: 'byToken', count: 'countOfToken' },
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
  return viewForm + await loanTable(result, tokens, invested, lensHub, verification, start, total, now);
}
