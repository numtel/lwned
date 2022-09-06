// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ERC20.sol";
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

  string public name = "Loan Backer Receipt";
  string public symbol = "LOAN";
  uint8 public decimals = 18;

  constructor(
    address _factory,
    address _borrower,
    address _token,
    uint _toGive,
    uint _toRepay,
    uint _deadlineIssue,
    uint _deadlineRepay,
    string memory _text
  ) {
    require(_deadlineIssue > block.timestamp);
    require(_deadlineRepay > _deadlineIssue);
    require(_toGive > 0);
    factory = _factory;
    borrower = _borrower;
    token = _token;
    amountToGive = _toGive;
    amountToRepay = _toRepay;
    deadlineIssue = _deadlineIssue;
    deadlineRepay = _deadlineRepay;
    text = _text;
  }

  function invest(uint amount) external {
    require(block.timestamp < deadlineIssue);
    require(amount > 0);
    _mint(msg.sender, amount);
    safeTransfer.invokeFrom(token, msg.sender, address(this), amount);
  }

  // TODO nyi
  function divest(uint amount) external {
  }

  // TODO nyi
  // Principal investment is met, issue the loan
  function loanIssue() external {
    require(msg.sender == borrower);
    require(ERC20(token).balanceOf(address(this)) >= amountToGive);
    status = 1;
    emit LoanIssued(block.timestamp);
    safeTransfer.invoke(token, borrower, amountToGive);
  }

  // TODO nyi
  // Borrower repays loan before deadline
  function loanRepay() external {
    require(msg.sender == borrower);
    require(deadlineRepay > block.timestamp);
    status = 2;
    emit LoanRepaid(block.timestamp);
    safeTransfer.invokeFrom(token, borrower, address(this), amountToRepay);
  }

  // TODO nyi, allow divest to pull from collateral
  // Borrower has not repaid before the deadline
  function loanDefault() external {
    require(deadlineRepay < block.timestamp);
    // Loan must have not been repaid or already defaulted
    require(status == 0 || status == 1);
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
      _text
    );
    loansByBorrower[msg.sender].push(application);
    pendingApplications.push(application);
  }

}
