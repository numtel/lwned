// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ERC20.sol";
import "./IERC20.sol";
import "./safeTransfer.sol";
import "./AddressSet.sol";
using AddressSet for AddressSet.Set;

contract Loan is ERC20 {
  Lwned public factory;
  address public borrower;
  address public token;
  enum Status { PENDING, ACTIVE, REPAID, DEFAULTED, CANCELED }
  Status public status;
  uint public amountToGive;
  uint public amountToRepay;
  uint public deadlineIssue;
  uint public deadlineRepay;
  address[] public collateralTokens;
  uint[] public collateralAmounts;
  string public text;

  struct Comment {
    address author;
    uint timestamp;
    string text;
  }
  Comment[] public comments;

  event NewComment(address indexed author, string text);
  event InvestmentChanged(uint oldAmount, uint newAmount);
  event LoanIssued(uint timestamp);
  event LoanRepaid(uint timestamp);
  event LoanDefaulted(uint timestamp);
  event LoanCanceled(uint timestamp);

  string public name = "Lwned Lender Receipt";
  string public symbol = "LWNED";
  uint8 public decimals;

  constructor(
    Lwned _factory,
    address _borrower,
    address _token,
    uint _toGive,
    uint _toRepay,
    uint _deadlineIssue,
    uint _deadlineRepay,
    address[] memory _collateralTokens,
    uint[] memory _collateralAmounts,
    string memory _text
  ) {
    require(_deadlineIssue > block.timestamp);
    require(_deadlineRepay > _deadlineIssue);
    require(_toGive > 0);
    factory = _factory;
    borrower = _borrower;
    token = _token;
    decimals = IERC20(token).decimals();
    amountToGive = _toGive;
    amountToRepay = _toRepay;
    deadlineIssue = _deadlineIssue;
    deadlineRepay = _deadlineRepay;
    collateralTokens = _collateralTokens;
    collateralAmounts = _collateralAmounts;
    text = _text;
  }

  function invest(uint amount) external {
    require(block.timestamp < deadlineIssue);
    require(amount > 0);
    emit InvestmentChanged(totalSupply, totalSupply + amount);
    _mint(msg.sender, amount);
    // Don't allow collecting more investment than requested
    require(totalSupply <= amountToGive);
    safeTransfer.invokeFrom(token, msg.sender, address(this), amount);
  }

  function divest(uint amount) external {
    emit InvestmentChanged(totalSupply, totalSupply - amount);
    emit Transfer(msg.sender, address(0), amount);
    balanceOf[msg.sender] -= amount;
    totalSupply -= amount;
    if(status == Status.PENDING) {
      // Loan not yet approved
      safeTransfer.invoke(token, msg.sender, amount);
    } else if(status == Status.ACTIVE) {
      // Loan has been issued, cannot divest at the moment
      require(false);
    } else if(status == Status.REPAID) {
      // Loan has been repaid, withdraw mature amount
      safeTransfer.invoke(token, msg.sender, (amount * amountToRepay) / amountToGive);
    } else if(status == Status.DEFAULTED || (status == Status.ACTIVE && deadlineRepay < block.timestamp)) {
      // Save users a transaction by allowing a loan to be divested and defaulted at once
      if(status == Status.ACTIVE) loanDefault();
      // Loan has defaulted, withdraw the collateral
      for(uint i = 0; i < collateralTokens.length; i++) {
        safeTransfer.invoke(collateralTokens[i], msg.sender, (amount * collateralAmounts[i]) / amountToGive);
      }
    }
  }

  // Principal investment is met, issue the loan
  function loanIssue() external {
    require(status == Status.PENDING);
    require(msg.sender == borrower);
    require(totalSupply == amountToGive);
    status = Status.ACTIVE;
    emit LoanIssued(block.timestamp);
    factory.markAsActive();
    safeTransfer.invoke(token, borrower, amountToGive);
  }

  // Borrower repays loan before deadline
  function loanRepay() external {
    require(status == Status.ACTIVE);
    require(msg.sender == borrower);
    require(deadlineRepay > block.timestamp);
    status = Status.REPAID;
    emit LoanRepaid(block.timestamp);
    safeTransfer.invokeFrom(token, borrower, address(this), amountToRepay);
    _refundCollateral();
  }

  // Borrower withdraws collateral of loan that never issued
  function loanCancel() external {
    require(status == Status.PENDING);
    require(msg.sender == borrower);
    require(deadlineIssue < block.timestamp);
    status = Status.CANCELED;
    emit LoanCanceled(block.timestamp);
    _refundCollateral();
  }

  // Transfer collateral back to borrower
  function _refundCollateral() internal {
    for(uint i = 0; i < collateralTokens.length; i++) {
      safeTransfer.invoke(collateralTokens[i], borrower, collateralAmounts[i]);
    }
  }

  // Borrower has not repaid before the deadline
  function loanDefault() public {
    require(status == Status.ACTIVE);
    require(deadlineRepay < block.timestamp);
    status = Status.DEFAULTED;
    emit LoanDefaulted(block.timestamp);
  }

  function commentCount() external view returns(uint) {
    return comments.length;
  }

  function postComment(string memory _text) external {
    comments.push(Comment(msg.sender, block.timestamp, _text));
    emit NewComment(msg.sender, _text);
  }
}

contract Lwned {
  mapping(address => Loan[]) public loansByBorrower;
  AddressSet.Set pendingApplications;
  AddressSet.Set activeLoans;

  event NewApplication(address indexed borrower, address loan);

  function newApplication(
    address _token,
    uint _toGive,
    uint _toRepay,
    uint _deadlineIssue,
    uint _deadlineRepay,
    address[] memory _collateralTokens,
    uint[] memory _collateralAmounts,
    string memory _text
  ) external {
    Loan application = new Loan(
      this,
      msg.sender,
      _token,
      _toGive,
      _toRepay,
      _deadlineIssue,
      _deadlineRepay,
      _collateralTokens,
      _collateralAmounts,
      _text
    );

    // Transfer collateral to contract from borrower
    // User won't know loan contract instance address at this time
    // so they can't approve the spends to that address,
    // so perform the collateral transfer here
    require(_collateralAmounts.length == _collateralTokens.length);
    for(uint i = 0; i < _collateralTokens.length; i++) {
      safeTransfer.invokeFrom(_collateralTokens[i], msg.sender, address(application), _collateralAmounts[i]);
    }

    loansByBorrower[msg.sender].push(application);
    pendingApplications.insert(address(application));
    emit NewApplication(msg.sender, address(application));
  }

  // Invoked by the Loan contract internally
  function markAsActive() external {
    require(pendingApplications.exists(msg.sender));
    pendingApplications.remove(msg.sender);
    activeLoans.insert(msg.sender);

  }

  function pendingCount() external view returns(uint) {
    return pendingApplications.count();
  }

  function pendingAt(uint index) external view returns(address) {
    return pendingApplications.keyList[index];
  }

  function activeCount() external view returns(uint) {
    return activeLoans.count();
  }

  function activeAt(uint index) external view returns(address) {
    return activeLoans.keyList[index];
  }

}
