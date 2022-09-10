// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface ILwnedBrowser {
  struct LoanDetails {
    address loan;
    address borrower;
    address token;
    uint8 status;
    uint amountToGive;
    uint amountToRepay;
    uint deadlineIssue;
    uint deadlineRepay;
    address[] collateralTokens;
    uint[] collateralAmounts;
    uint commentCount;
    string text;
  }
  struct Comment {
    address author;
    uint timestamp;
    string text;
  }

  function byBorrower(
    address factory,
    address borrower,
    uint startIndex,
    uint fetchCount
  ) external view returns(LoanDetails[] memory);

  function pending(
    address factory,
    uint startIndex,
    uint fetchCount
  ) external view returns(LoanDetails[] memory);

  function active(
    address factory,
    uint startIndex,
    uint fetchCount
  ) external view returns(LoanDetails[] memory);

  function comments(
    address loan,
    uint startIndex,
    uint fetchCount
  ) external view returns(Comment[] memory);
}
