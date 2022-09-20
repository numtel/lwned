
function applyForm(lwned) {
  return `
    <section>
    <form id="new-loan" onsubmit="submitNewLoanForm(this); return false;">
      <fieldset><legend>New Loan Application</legend>
      <label for="loan-name">Loan Name</label>
      <p class="help">Short (5-160 character) description</p>
      <input id="loan-name" required minlength="5" maxlength="160">
      <label for="token">Token</label>
      <p class="help">Address of loan token. Disbursement and repayment are denominated in this token.</p>
      <input name="token" id="token" class="token" required match="^0x[a-fA-F0-9]{40}$" onchange="setToken(this)"><span class="token"></span>${commonTokens()}
      <label for="loan-give">Loan Amount</label>
      <p class="help">Amount received on successful loan funding.</p>
      <input id="loan-give" inputmode="decimal" name="toGive" required>
      <label for="loan-repay">Repayment Amount</label>
      <p class="help">Amount to repay before end of term in order to regain access to collateral.</p>
      <input id="loan-repay" inputmode="decimal" name="toRepay" required>
      <label for="deadline-issue">Issuance Deadline</label>
      <p class="help">Loan principal amount must be raised before this time or loan will automatically be canceled.</p>
      <input id="deadline-issue" name="deadlineIssueDate" required type="date">
      <input name="deadlineIssueTime" required type="time">
      <label for="deadline-repay">Repayment Deadline</label>
      <p class="help">Loan must be repaid by this time or loan will automatically default, allowing lenders to collect any collateral.</p>
      <input id="deadline-repay" name="deadlineRepayDate" required type="date">
      <input name="deadlineRepayTime" required type="time">
      <label>Collateral</label>
      <p class="help">Provide some capital to lenders in case of inability to repay before deadline.</p>
      <div class="collateral">
        <button type="button" onclick="addCollateral(this)">Add Collateral...</button>
      </div>
      <label for="text">Submission Statement</label>
      <p class="help">Additional information to help lenders understand why they should fund the loan.</p>
      <textarea id="text" name="text"></textarea>
      <p class="help">After submitting, your loan application will be in a "Pending" state until you move it to an "Active" issued state or "Canceled" state.</p>
      <button type="submit">Submit</button>
      <p><a href="${explorer(lwned.options.address)}">View Contract on Explorer</a></p>
      </fieldset>
    </form>
    </section>
  `;
}

function commonTokens() {
  return `
    <div class="common">
      ${tokenButton("0x2791bca1f2de4661ed88a30c99a7a9449aa84174", "USDC")}
      ${tokenButton("0xc2132d05d31c914a87c6611c10748aeb04b58e8f", "USDT")}
      ${tokenButton("0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", "DAI")}
    </div>
  `;
}

function tokenButton(tokenAddress, tokenSymbol) {
  return `<button type="button" onclick="const el=this.parentNode.parentNode.querySelector('input.token'); el.value='${tokenAddress}'; el.onchange(); return false">${tokenSymbol}</button>`;
}

