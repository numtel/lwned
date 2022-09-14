
function applyForm(lwned) {
  return `
    <form id="new-loan" onsubmit="submitNewLoanForm(this); return false;">
      <fieldset><legend>New Loan Application</legend>
      <label for="loan-name">Loan Name</label>
      <input id="loan-name" required minlength="5" maxlength="160">
      <label for="token">Token</label>
      <input name="token" id="token" required match="^0x[a-fA-F0-9]{40}$" onchange="setToken(this)"><span></span>${commonTokens()}
      <label for="loan-give">Loan Amount</label>
      <input id="loan-give" name="toGive" required>
      <label for="loan-repay">Repayment Amount</label>
      <input id="loan-repay" name="toRepay" required>
      <label for="deadline-issue">Issuance Deadline</label>
      <input id="deadline-issue" name="deadlineIssueDate" required type="date">
      <input name="deadlineIssueTime" required type="time">
      <label for="deadline-repay">Repayment Deadline</label>
      <input id="deadline-repay" name="deadlineRepayDate" required type="date">
      <input name="deadlineRepayTime" required type="time">
      <label>Collateral</label>
      <div class="collateral">
        <button type="button" onclick="addCollateral(this)">Add Collateral...</button>
      </div>
      <label for="text">Submission Statement</label>
      <textarea id="text" name="text"></textarea>
      <button type="submit">Submit</button>
      <p><a href="${explorer(lwned.options.address)}">View Contract on Explorer</a></p>
      </fieldset>
    </form>
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
  return `<button type="button" onclick="const el=this.parentNode.parentNode.firstElementChild; el.value='${tokenAddress}'; el.onchange(); return false">${tokenSymbol}</button>`;
}

