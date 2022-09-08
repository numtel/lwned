// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";

interface ILoan is IERC20 {
  function factory() external view returns(address);
  function borrower() external view returns(address);
  function token() external view returns(address);
  function status() external view returns(uint8);
  function amountToGive() external view returns(uint);
  function amountToRepay() external view returns(uint);
  function deadlineIssue() external view returns(uint);
  function deadlineRepay() external view returns(uint);
  function collateralCount() external view returns(uint);
  function collateralTokens(uint index) external view returns(address);
  function collateralAmounts(uint index) external view returns(uint);
  function text() external view returns(string memory);

  struct Comment {
    address author;
    uint timestamp;
    string text;
  }
  function comments(uint index) external view returns(Comment memory);

  event NewComment(address indexed author, string text);
  event InvestmentChanged(uint oldAmount, uint newAmount);
  event LoanIssued(uint timestamp);
  event LoanRepaid(uint timestamp);
  event LoanDefaulted(uint timestamp);
  event LoanCanceled(uint timestamp);

  function invest(uint amount) external;
  function divest(uint amount) external;
  function loanIssue() external;
  function loanRepay() external;
  function loanCancel() external;
  function loanDefault() external;
  function commentCount() external view returns(uint);
  function postComment(string memory _text) external;
}
