
async function loanDetails(loan) {
  const tokens = await tokenData(loan.collateralTokens.concat(loan.token));
  const invested = await totalSupply(loan.loan);
  const loanDecimals = await decimals(loan.loan);
  const maxInvest = applyDecimals(new web3.utils.BN(loan.amountToGive).sub(new web3.utils.BN(invested)).toString(), loanDecimals);
  const now = await currentTimestamp();
  return `
    <div class="loan">
      ${loanSpec(loan, tokens, invested, now)}
    </div>
    <div class="loan-text">${userInput(loan.text)}</div>
    ${loan.status === '0' ? `
      <p class="loan-actions" data-borrower="${loan.borrower}">
        ${maxInvest === '0' ? `<button onclick="loanIssue('${loan.loan}')">Issue</button>` : ''}
        <button onclick="loanCancel('${loan.loan}')">Cancel</button>
      </p>
      ${investForm(loan, maxInvest) + divestForm(loan)}
    ` : loan.status === '1' ? `
      <p class="loan-actions" data-borrower="${loan.borrower}">
        <button onclick="loanRepay('${loan.loan}', '${loan.token}', '${loan.amountToRepay}')">Repay</button>
        <span data-my-balance="${loan.token}"></span>
      </p>
    ` : loan.status === '4' || loan.status === '2' || loan.status === '3' ? `
      ${divestForm(loan)}
    ` : ''}
  `;
}

function loanSpec(loan, tokens, invested, now) {
  return `
    <span class="status-badge ${states[loan.status]}">${states[loan.status]}</span>
    <a class="loan-name" title="Loan Details" href="/loan/${loan.loan}">${loan.name}</a>
    <span class="borrower">Borrower: <a href="/account/${loan.borrower}" title="Borrower Profile">${ellipseAddress(loan.borrower)}</a></span>
    <span class="amount">${loan.status === '0' ? `Raised ${tokens(loan.token, invested, true)} of ` : ''}${tokens(loan.token, loan.amountToGive)}, pays ${Math.floor(new web3.utils.BN(loan.amountToRepay).mul(new web3.utils.BN(10000)).div(new web3.utils.BN(loan.amountToGive)).toNumber() - 10000) / 100}%</span>
    <span class="deadline">${loan.status !== '0' ? '' : `
    ${loan.deadlineIssue > now ? `Issue within <time datetime="${new Date(loan.deadlineIssue * 1000).toJSON()}" title="${new Date(loan.deadlineIssue * 1000).toLocaleString()}">${remaining(loan.deadlineIssue - now, true)}` : 'Issuance Deadline Passed'}</time>,`}
    ${loan.deadlineRepay > now ? `Repay within <time datetime="${new Date(loan.deadlineRepay * 1000).toJSON()}" title="${new Date(loan.deadlineRepay * 1000).toLocaleString()}">${remaining(loan.deadlineRepay - now, true)}` : 'Repayment Deadline Passed'}</time></span>
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
      <fieldset><legend>Divest</legend>
      <div class="row">
      <label for="divest-amount">Amount <span data-my-balance="${loan.loan}"></span></label>
      <input id="divest-amount" type="number" required min="0">
      </div>
      <button>Submit</button>
      </fieldset>
    </form>
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

async function loanList(url, lwned, browser) {
  const views = [
    { label: 'Pending (Query irrelevant)',
      method: 'pending', count: 'pendingCount' },
    { label: 'Pending with ID Hash (Query irrelevant)',
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
  return viewForm + loanTable(result, tokens, invested, start, total, now);
}
