// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILwned.sol";
import "./ILoan.sol";

contract LwnedBrowser {
  struct LoanDetails {
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

  function byBorrower(
    ILwned factory,
    address borrower,
    uint startIndex,
    uint fetchCount
  ) external view returns(LoanDetails[] memory) {
    uint itemCount = factory.countOf(borrower);
    require(startIndex < itemCount);
    if(startIndex + fetchCount >= itemCount) {
      fetchCount = itemCount - startIndex;
    }
    LoanDetails[] memory out = new LoanDetails[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      ILoan loan = ILoan(factory.loansByBorrower(borrower, startIndex + i));
      out[i] = LoanDetails(
        borrower,
        loan.token(),
        loan.status(),
        loan.amountToGive(),
        loan.amountToRepay(),
        loan.deadlineIssue(),
        loan.deadlineRepay(),
        loan.allCollateralTokens(),
        loan.allCollateralAmounts(),
        loan.commentCount(),
        loan.text()
      );
    }
    return out;
  }

  function pending(
    ILwned factory,
    uint startIndex,
    uint fetchCount
  ) external view returns(LoanDetails[] memory) {
    uint itemCount = factory.pendingCount();
    require(startIndex < itemCount);
    if(startIndex + fetchCount >= itemCount) {
      fetchCount = itemCount - startIndex;
    }
    LoanDetails[] memory out = new LoanDetails[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      ILoan loan = ILoan(factory.pendingAt(startIndex + i));
      out[i] = LoanDetails(
        loan.borrower(),
        loan.token(),
        loan.status(),
        loan.amountToGive(),
        loan.amountToRepay(),
        loan.deadlineIssue(),
        loan.deadlineRepay(),
        loan.allCollateralTokens(),
        loan.allCollateralAmounts(),
        loan.commentCount(),
        loan.text()
      );
    }
    return out;
  }

  function active(
    ILwned factory,
    uint startIndex,
    uint fetchCount
  ) external view returns(LoanDetails[] memory) {
    uint itemCount = factory.activeCount();
    require(startIndex < itemCount);
    if(startIndex + fetchCount >= itemCount) {
      fetchCount = itemCount - startIndex;
    }
    LoanDetails[] memory out = new LoanDetails[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      ILoan loan = ILoan(factory.activeAt(startIndex + i));
      out[i] = LoanDetails(
        loan.borrower(),
        loan.token(),
        loan.status(),
        loan.amountToGive(),
        loan.amountToRepay(),
        loan.deadlineIssue(),
        loan.deadlineRepay(),
        loan.allCollateralTokens(),
        loan.allCollateralAmounts(),
        loan.commentCount(),
        loan.text()
      );
    }
    return out;
  }
}
