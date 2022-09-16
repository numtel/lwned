const assert = require('assert');

exports.createLoan = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const verify = await deployContract(accounts[0], 'MockVerification');
  const factory = await deployContract(accounts[0], 'Lwned', verify.options.address);
  const token = await deployContract(accounts[0], 'MockERC20');

  const now = (await web3.eth.getBlock('latest')).timestamp;
  const deadlineIssue = 30;
  const deadlineRepay = 300;
  const toGive = 1000000;
  const toRepay  = 1090000;
  const interest = toRepay - toGive;
  const collateral = 500000;
  const submissionStatement = "heyo gimme some skrilla";

  await token.sendFrom(accounts[0]).mint(accounts[0], collateral + interest);
  await token.sendFrom(accounts[0]).approve(factory.options.address, collateral + interest);

  // Create loan
  const result = await factory.sendFrom(accounts[0]).newApplication(
    token.options.address,
    toGive,
    toRepay,
    now + deadlineIssue,
    now + deadlineIssue + deadlineRepay,
    [token.options.address],
    [collateral],
    submissionStatement, 'Loan Name'
  );

  assert.strictEqual(result.events.NewApplication.returnValues.borrower, accounts[0]);
  const loan = await loadContract('Loan', result.events.NewApplication.returnValues.loan);
  // Is loan listed as pending on factory?
  assert.strictEqual(await factory.methods.pendingCount().call(), '1');
  assert.strictEqual(await factory.methods.pendingAt(0).call(), loan.options.address);
  // Is loan listed by borrower on factory?
  assert.strictEqual(await factory.methods.countOf(accounts[0]).call(), '1');
  assert.strictEqual(await factory.methods.loansByBorrower(accounts[0], 0).call(), loan.options.address);

  assert.strictEqual(await loan.methods.status().call(), '0');
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[0]).call()), interest);


  // Fund from next account
  await token.sendFrom(accounts[1]).mint(accounts[1], toGive);
  await token.sendFrom(accounts[1]).approve(loan.options.address, toGive);
  await loan.sendFrom(accounts[1]).invest(toGive);

  // Issue the loan
  await loan.sendFrom(accounts[0]).loanIssue();
  // Did loan move from pending to active on factory?
  assert.strictEqual(await factory.methods.pendingCount().call(), '0');
  assert.strictEqual(await factory.methods.activeCount().call(), '1');
  assert.strictEqual(await factory.methods.activeAt(0).call(), loan.options.address);

  assert.strictEqual(Number(await token.methods.balanceOf(accounts[0]).call()), toRepay);
  assert.strictEqual(await loan.methods.status().call(), '1');

  // Divest throws during active
  assert.strictEqual(await throws(() =>
    loan.sendFrom(accounts[1]).divest(toGive)), true);

  // Repay the loan
  await token.sendFrom(accounts[0]).approve(loan.options.address, toRepay);
  await loan.sendFrom(accounts[0]).loanRepay();
  assert.strictEqual(await loan.methods.status().call(), '2');


  // Borrower has received their collateral
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[0]).call()), collateral);

  // Investor gets the interest
  assert.strictEqual(Number(await loan.methods.balanceOf(accounts[1]).call()), toGive);
  await loan.sendFrom(accounts[1]).divest(toGive);
  // Their loan ERC20 tokens have increased in value
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[1]).call()), toRepay);

};

exports.loanCanceled = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const verify = await deployContract(accounts[0], 'MockVerification');
  const factory = await deployContract(accounts[0], 'Lwned', verify.options.address);
  const token = await deployContract(accounts[0], 'MockERC20');

  const now = (await web3.eth.getBlock('latest')).timestamp;
  const deadlineIssue = 30;
  const deadlineRepay = 300;
  const toGive = 1000000;
  const toRepay  = 1090000;
  const interest = toRepay - toGive;
  const collateral = 500000;
  const submissionStatement = "heyo gimme some skrilla";

  await token.sendFrom(accounts[0]).mint(accounts[0], collateral);
  await token.sendFrom(accounts[0]).approve(factory.options.address, collateral);

  // Create loan
  const result = await factory.sendFrom(accounts[0]).newApplication(
    token.options.address,
    toGive,
    toRepay,
    now + deadlineIssue,
    now + deadlineIssue + deadlineRepay,
    [token.options.address],
    [collateral],
    submissionStatement, 'Loan Name'
  );
  const loan = await loadContract('Loan', result.events.NewApplication.returnValues.loan);

  // Invest and divest from the loan
  await token.sendFrom(accounts[1]).mint(accounts[1], toGive);
  await token.sendFrom(accounts[1]).approve(loan.options.address, toGive);
  await loan.sendFrom(accounts[1]).invest(toGive);
  await loan.sendFrom(accounts[1]).divest(toGive);

  // Invest less than requested
  await token.sendFrom(accounts[1]).approve(loan.options.address, toGive - 1);
  await loan.sendFrom(accounts[1]).invest(toGive - 1);

  await loan.sendFrom(accounts[0]).loanCancel();
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[0]).call()), collateral);

  // Cannot divest more than invested
  assert.strictEqual(await throws(() =>
    loan.sendFrom(accounts[1]).divest(toGive)), true);
  // Can divest after canceled
  await loan.sendFrom(accounts[1]).divest(toGive - 1);

}

exports.loanDefaulted = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const verify = await deployContract(accounts[0], 'MockVerification');
  const factory = await deployContract(accounts[0], 'Lwned', verify.options.address);
  const token = await deployContract(accounts[0], 'MockERC20');

  const now = (await web3.eth.getBlock('latest')).timestamp;
  const deadlineIssue = 30;
  const deadlineRepay = 300;
  const toGive = 1000000;
  const toRepay  = 1090000;
  const interest = toRepay - toGive;
  const collateral = 500000;
  const submissionStatement = "heyo gimme some skrilla";

  await token.sendFrom(accounts[0]).mint(accounts[0], collateral);
  await token.sendFrom(accounts[0]).approve(factory.options.address, collateral);

  // Create loan
  const result = await factory.sendFrom(accounts[0]).newApplication(
    token.options.address,
    toGive,
    toRepay,
    now + deadlineIssue,
    now + deadlineIssue + deadlineRepay,
    [token.options.address],
    [collateral],
    submissionStatement, 'Loan Name'
  );
  const loan = await loadContract('Loan', result.events.NewApplication.returnValues.loan);

  // Invest and divest from the loan
  await token.sendFrom(accounts[1]).mint(accounts[1], toGive);
  await token.sendFrom(accounts[1]).approve(loan.options.address, toGive);
  await loan.sendFrom(accounts[1]).invest(toGive);

  await loan.sendFrom(accounts[0]).loanIssue();
  await increaseTime(deadlineIssue + deadlineRepay + 5);

  // Can divest after default
  await loan.sendFrom(accounts[1]).divest(toGive);
  // Only receive collateral amount
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[1]).call()), collateral);
  // Borrower still has the loan
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[0]).call()), toGive);

}

exports.multipleCollateralAndInvestorDefault = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const verify = await deployContract(accounts[0], 'MockVerification');
  const factory = await deployContract(accounts[0], 'Lwned', verify.options.address);
  const token = await deployContract(accounts[0], 'MockERC20');
  const token2 = await deployContract(accounts[0], 'MockERC20');

  const now = (await web3.eth.getBlock('latest')).timestamp;
  const deadlineIssue = 30;
  const deadlineRepay = 300;
  const toGive = 1000000;
  const toRepay  = 1090000;
  const interest = toRepay - toGive;
  const collateral = 500000;
  const collateral2 = 800000;
  const submissionStatement = "heyo gimme some skrilla";

  await token.sendFrom(accounts[0]).mint(accounts[0], collateral);
  await token.sendFrom(accounts[0]).approve(factory.options.address, collateral);
  await token2.sendFrom(accounts[0]).mint(accounts[0], collateral2);
  await token2.sendFrom(accounts[0]).approve(factory.options.address, collateral2);

  // Create loan
  const result = await factory.sendFrom(accounts[0]).newApplication(
    token.options.address,
    toGive,
    toRepay,
    now + deadlineIssue,
    now + deadlineIssue + deadlineRepay,
    [token.options.address, token2.options.address],
    [collateral, collateral2],
    submissionStatement, 'Loan Name'
  );
  const loan = await loadContract('Loan', result.events.NewApplication.returnValues.loan);

  // Invest and divest from the loan
  const give1 = 0.25, give2 = 1 - give1;
  await token.sendFrom(accounts[1]).mint(accounts[1], toGive * give1);
  await token.sendFrom(accounts[1]).approve(loan.options.address, toGive * give1);
  await loan.sendFrom(accounts[1]).invest(toGive * give1);
  await token.sendFrom(accounts[2]).mint(accounts[2], toGive * give2);
  await token.sendFrom(accounts[2]).approve(loan.options.address, toGive * give2);
  await loan.sendFrom(accounts[2]).invest(toGive * give2);

  await loan.sendFrom(accounts[0]).loanIssue();
  await increaseTime(deadlineIssue + deadlineRepay + 5);

  // Can divest after default
  await loan.sendFrom(accounts[1]).divest(toGive * give1);
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[1]).call()), collateral * give1);
  assert.strictEqual(Number(await token2.methods.balanceOf(accounts[1]).call()), collateral2 * give1);
  await loan.sendFrom(accounts[2]).divest(toGive * give2);
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[2]).call()), collateral * give2);
  assert.strictEqual(Number(await token2.methods.balanceOf(accounts[2]).call()), collateral2 * give2);

}


exports.multipleCollateralAndInvestorRepay = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const verify = await deployContract(accounts[0], 'MockVerification');
  const factory = await deployContract(accounts[0], 'Lwned', verify.options.address);
  const token = await deployContract(accounts[0], 'MockERC20');
  const token2 = await deployContract(accounts[0], 'MockERC20');

  const now = (await web3.eth.getBlock('latest')).timestamp;
  const deadlineIssue = 30;
  const deadlineRepay = 300;
  const toGive = 1000000;
  const toRepay  = 1090000;
  const interest = toRepay - toGive;
  const collateral = 500000;
  const collateral2 = 800000;
  const submissionStatement = "heyo gimme some skrilla";

  await token.sendFrom(accounts[0]).mint(accounts[0], collateral + interest);
  await token.sendFrom(accounts[0]).approve(factory.options.address, collateral);
  await token2.sendFrom(accounts[0]).mint(accounts[0], collateral2);
  await token2.sendFrom(accounts[0]).approve(factory.options.address, collateral2);

  // Create loan
  const result = await factory.sendFrom(accounts[0]).newApplication(
    token.options.address,
    toGive,
    toRepay,
    now + deadlineIssue,
    now + deadlineIssue + deadlineRepay,
    [token.options.address, token2.options.address],
    [collateral, collateral2],
    submissionStatement, 'Loan Name'
  );
  const loan = await loadContract('Loan', result.events.NewApplication.returnValues.loan);

  // Invest and divest from the loan
  const give1 = 0.25, give2 = 1 - give1;
  await token.sendFrom(accounts[1]).mint(accounts[1], toGive * give1);
  await token.sendFrom(accounts[1]).approve(loan.options.address, toGive * give1);
  await loan.sendFrom(accounts[1]).invest(toGive * give1);
  await token.sendFrom(accounts[2]).mint(accounts[2], toGive * give2);
  await token.sendFrom(accounts[2]).approve(loan.options.address, toGive * give2);
  await loan.sendFrom(accounts[2]).invest(toGive * give2);

  await loan.sendFrom(accounts[0]).loanIssue();
  await token.sendFrom(accounts[0]).approve(loan.options.address, toRepay);
  await loan.sendFrom(accounts[0]).loanRepay();
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[0]).call()), collateral);
  assert.strictEqual(Number(await token2.methods.balanceOf(accounts[0]).call()), collateral2);

  // Investors collect their shares of the interest
  await loan.sendFrom(accounts[1]).divest(toGive * give1);
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[1]).call()), toRepay * give1);
  await loan.sendFrom(accounts[2]).divest(toGive * give2);
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[2]).call()), toRepay * give2);

}

exports.investMultipleTimes = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const verify = await deployContract(accounts[0], 'MockVerification');
  await verify.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  const idHash = await verify.methods.addressIdHash(accounts[0]).call();

  const factory = await deployContract(accounts[0], 'Lwned', verify.options.address);
  const token = await deployContract(accounts[0], 'MockERC20');

  const now = (await web3.eth.getBlock('latest')).timestamp;
  const deadlineIssue = 30;
  const deadlineRepay = 300;
  const toGive = 1000000;
  const toRepay  = 1090000;
  const interest = toRepay - toGive;
  const collateral = 500000;
  const submissionStatement = "heyo gimme some skrilla";

  await token.sendFrom(accounts[0]).mint(accounts[0], collateral + interest);
  await token.sendFrom(accounts[0]).approve(factory.options.address, collateral);

  // Create loan
  const result = await factory.sendFrom(accounts[0]).newApplication(
    token.options.address,
    toGive,
    toRepay,
    now + deadlineIssue,
    now + deadlineIssue + deadlineRepay,
    [token.options.address],
    [collateral],
    submissionStatement, 'Loan Name'
  );
  const loan = await loadContract('Loan', result.events.NewApplication.returnValues.loan);
  assert.strictEqual(await factory.methods.countOfIdHash(idHash).call(), '1');
  assert.strictEqual(await factory.methods.pendingCountWithIdHash().call(), '1');
  assert.strictEqual(await factory.methods.loansByBorrowerIdHash(idHash, 0).call(), loan.options.address);

  // Invest and divest from the loan
  const give1 = 0.25, give2 = 1 - give1;
  await token.sendFrom(accounts[1]).mint(accounts[1], toGive);
  await token.sendFrom(accounts[1]).approve(loan.options.address, toGive);
  await loan.sendFrom(accounts[1]).invest(toGive * give1);
  await loan.sendFrom(accounts[1]).invest(toGive * give2);

  await loan.sendFrom(accounts[0]).loanIssue();

  assert.strictEqual(await factory.methods.countOfLender(accounts[1]).call(), '1');
  assert.strictEqual(await factory.methods.loansByLender(accounts[1], 0).call(), loan.options.address);

}


exports.postComment = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT, increaseTime,
}) {
  const verify = await deployContract(accounts[0], 'MockVerification');
  const factory = await deployContract(accounts[0], 'Lwned', verify.options.address);
  const token = await deployContract(accounts[0], 'MockERC20');
  const browser = await deployContract(accounts[0], 'LwnedBrowser');

  const now = (await web3.eth.getBlock('latest')).timestamp;
  const deadlineIssue = 30;
  const deadlineRepay = 300;
  const toGive = 1000000;
  const toRepay  = 1090000;
  const interest = toRepay - toGive;
  const collateral = 500000;
  const submissionStatement = "heyo gimme some skrilla";

  await token.sendFrom(accounts[0]).mint(accounts[0], collateral + interest);
  await token.sendFrom(accounts[0]).approve(factory.options.address, collateral + interest);

  // Create loan
  const result = await factory.sendFrom(accounts[0]).newApplication(
    token.options.address,
    toGive,
    toRepay,
    now + deadlineIssue,
    now + deadlineIssue + deadlineRepay,
    [token.options.address],
    [collateral],
    submissionStatement, 'Loan Name'
  );

  assert.strictEqual(result.events.NewApplication.returnValues.borrower, accounts[0]);
  const loan = await loadContract('Loan', result.events.NewApplication.returnValues.loan);
  assert.strictEqual(await factory.methods.pendingCountWithIdHash().call(), '0');

  const commentText = 'hello';
  await browser.sendFrom(accounts[0]).postComment(loan.options.address, commentText);
  const list = await browser.methods.comments(loan.options.address, 0, 2).call();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].author, accounts[0]);
  assert.strictEqual(list[0].text, commentText);

};

