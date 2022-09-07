// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ERC20.sol";
import "./IERC20.sol";
import "./safeTransfer.sol";

contract Loan is ERC20 {
  address public factory;
  address public borrower;
  address public token;
  uint8 public status;
  uint public amountToGive;
  uint public amountToRepay;
  uint public deadlineIssue;
  uint public deadlineRepay;
  address[] public collateralTokens;
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

  string public name = "Lwned Lender Receipt";
  string public symbol = "LWNED";
  uint8 public decimals;

  constructor(
    address _factory,
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
    text = _text;
    // Transfer collateral to contract from borrower
    require(_collateralAmounts.length == _collateralTokens.length);
    collateralTokens = _collateralTokens;
    for(uint i = 0; i < collateralTokens.length; i++) {
      safeTransfer.invokeFrom(collateralTokens[i], borrower, address(this), _collateralAmounts[i]);
    }
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
    if(status == 0) {
      // Loan not yet approved
      safeTransfer.invoke(token, msg.sender, amount);
    } else if(status == 1) {
      // Loan has been issued, cannot divest at the moment
      require(false);
    } else if(status == 2) {
      // Loan has been repaid, withdraw mature amount
      safeTransfer.invoke(token, msg.sender, (amount * amountToRepay) / amountToGive);
    } else if(status == 3 || (status == 1 && deadlineRepay < block.timestamp)) {
      // Save users a transaction by allowing a loan to be divested and defaulted at once
      if(status == 1) loanDefault();
      // Loan has defaulted, withdraw the collateral
      for(uint i = 0; i < collateralTokens.length; i++) {
        uint balance = ERC20(collateralTokens[i]).balanceOf(address(this));
        safeTransfer.invoke(collateralTokens[i], msg.sender, (amount * balance) / amountToGive);
      }
    }
  }

  // Principal investment is met, issue the loan
  function loanIssue() external {
    require(status == 0);
    require(msg.sender == borrower);
    require(ERC20(token).balanceOf(address(this)) == amountToGive);
    status = 1;
    emit LoanIssued(block.timestamp);
    safeTransfer.invoke(token, borrower, amountToGive);
  }

  // Borrower repays loan before deadline
  function loanRepay() external {
    require(status == 1);
    require(msg.sender == borrower);
    require(deadlineRepay > block.timestamp);
    status = 2;
    emit LoanRepaid(block.timestamp);
    safeTransfer.invokeFrom(token, borrower, address(this), amountToRepay);
    // Transfer collateral back to borrower
    for(uint i = 0; i < collateralTokens.length; i++) {
      uint balance = ERC20(collateralTokens[i]).balanceOf(address(this));
      safeTransfer.invoke(collateralTokens[i], borrower, balance);
    }
  }

  // Borrower has not repaid before the deadline
  function loanDefault() public {
    require(status == 1);
    require(deadlineRepay < block.timestamp);
    status = 3;
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
  Loan[] public pendingApplications;
  Loan[] public activeLoans;

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
      address(this),
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
    loansByBorrower[msg.sender].push(application);
    pendingApplications.push(application);
  }

}
