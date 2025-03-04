const {
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { expect } = require("chai");
  const { ethers } = require("hardhat");

  const rewardRate = 100; 
  const toWei = (x) => ethers.parseEther(x.toString());
const fromWei = (x) => ethers.formatEther(x.toString());

  // util function to determine tokenrewaed based on eth contibution
const calculateTokenReward =(ethContribution) =>{

     let result = toWei(ethContribution) * toWei(rewardRate.toString()) / toWei(1);
      return  result.toString();
  }
  
  // Fixture to deploy contracts for testing
  async function deployCrowdfundingFixture() {
    // extract account signers
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    // Contract parameters
    const goal = ethers.parseEther("50"); //50 ETH
    const NFT_THRESHOLD = ethers.parseEther("5"); 
    
    // Deploy CrowdToken (ERC20)
    const CrowdToken = await ethers.getContractFactory("CrowdToken");
    const rewardToken = await CrowdToken.deploy();
 

    
    // Deploy CrowdNFT (ERC721)
    const CrowdNFT = await ethers.getContractFactory("CrowdNFT");
    const rewardNFT = await CrowdNFT.deploy();
   


    
    // Deploy CrowdFunding
    const CrowdFunding = await ethers.getContractFactory("CrowdFunding");
    const crowdFunding = await CrowdFunding.deploy( rewardRate);


    
    // Set crowdfunding contract in the token contracts
    await rewardToken.setCrowdfundingContract(crowdFunding.target);
    await rewardNFT.setCrowdfundingContract(crowdFunding.target);
    
    return {crowdFunding, rewardToken, rewardNFT,
      owner,
      addr1,
      addr2,
      addr3,
      goal,
      rewardRate,
      NFT_THRESHOLD
    };
  }
  
  describe("CrowdFunding Contract", function () {
    // Test deployment state
    describe("Deployment", function () {
      it("Should set the correct CrowdFunding contract owner", async function () {
        const { crowdFunding, owner } = await loadFixture(deployCrowdfundingFixture);
        expect(await crowdFunding.Owner()).to.equal(owner.address);

      });
  
      it("Should set the correct funding goal", async function () {
        const { crowdFunding, goal } = await loadFixture(deployCrowdfundingFixture);
        expect(await crowdFunding.FUNDING_GOAL()).to.equal(goal);
      });
  
      it("Should set the correct token reward rate", async function () {
        const { crowdFunding, rewardRate } = await loadFixture(deployCrowdfundingFixture);
        expect(await crowdFunding.tokenRewardRate()).to.equal(rewardRate);
      });
  
      it("Should set the correct NFT threshold", async function () {
        const { crowdFunding, NFT_THRESHOLD } = await loadFixture(deployCrowdfundingFixture);
        expect(await crowdFunding.NFT_THRESHOLD()).to.equal(NFT_THRESHOLD);
      });
  
      it("Should determine that totalFundsRaised is zero initially", async function () {
        const { crowdFunding } = await loadFixture(deployCrowdfundingFixture);
        expect(await crowdFunding.totalFundsRaised()).to.equal(0);
      });
  
      it("Should set isFundingComplete to false initially", async function () {
        const { crowdFunding } = await loadFixture(deployCrowdfundingFixture);
        expect(await crowdFunding.isFundingComplete()).to.equal(false);
      });
    });
  
    describe("Crowdfunding Transactions", () => {
      describe("Contributions", function () {
        it("Should allow users to contribute ETH", async function () {
          const { crowdFunding, addr1, addr2 } = await loadFixture(deployCrowdfundingFixture);
          const contributionAmount = ethers.parseEther("1");
  
          console.log("contribution amount____", contributionAmount)
          
          await expect(
            crowdFunding.connect(addr1).contribute({ value: contributionAmount })
          ).to.changeEtherBalances(
            [addr1, crowdFunding], 
            [-contributionAmount, contributionAmount]
          );
  
          console.log("Expected amount_____", contributionAmount)
          
          expect(await crowdFunding.totalFundsRaised()).to.equal(contributionAmount);
          expect(await crowdFunding.contributions(addr1.address)).to.equal(contributionAmount);
  
          expect(await crowdFunding.contributions(addr2.address)).to.equal("0");
        });
    
        it("Should emit ContributionReceived event", async function () {
          const { crowdFunding, addr1 } = await loadFixture(deployCrowdfundingFixture);
          const contributionAmount = ethers.parseEther("1");
          
          await expect(
            crowdFunding.connect(addr1).contribute({ value: contributionAmount })
          ).to.emit(crowdFunding, "ContributionReceived")
            .withArgs(addr1.address, contributionAmount);
        });

        it.only("should correctly determine that the tokenreward amount is  based on each contibutions", async () => {
          const{crowdFunding, addr1, rewardToken } = await loadFixture(deployCrowdfundingFixture) ;

          const rewardAmount = calculateTokenReward("2");
          console.log("rewardAmount.................", fromWei(rewardAmount))
          await 
          crowdFunding.connect(addr1).contribute({ value: toWei(2) })          
          let addr1RewardTokenBalance = await rewardToken.balanceOf(addr1.address);
  
            expect(toWei(addr1RewardTokenBalance)).to.equal((rewardAmount))
        })
      });
    
      // Test token rewards
      describe("Token Rewards", function () {
        it("Should mint tokens based on contribution amount", async function () {
          const { crowdFunding, rewardToken, addr1, rewardRate } = await loadFixture(deployCrowdfundingFixture);
          const contributionAmount = ethers.parseEther("2");
          const expectedTokens = (contributionAmount * BigInt(rewardRate)) / ethers.parseEther("1");
          
          await crowdFunding.connect(addr1).contribute({ value: contributionAmount });
          
          expect(await rewardToken.balanceOf(addr1.address)).to.equal(expectedTokens);
        });
    
        it("Should emit TokenRewardSent event", async function () {
          const { crowdFunding, addr1, rewardRate } = await loadFixture(deployCrowdfundingFixture);
          const contributionAmount = ethers.parseEther("2");
          const expectedTokens = (contributionAmount * BigInt(rewardRate)) / ethers.parseEther("1");
          
          await expect(
            crowdFunding.connect(addr1).contribute({ value: contributionAmount })
          ).to.emit(crowdFunding, "TokenRewardSent")
            .withArgs(addr1.address, expectedTokens);
        });
      });
    
      // Test NFT rewards
      describe("NFT Rewards", function () {
        it("Should not mint NFT if contribution is below threshold", async function () {
          const { crowdFunding, rewardNFT, addr1 } = await loadFixture(deployCrowdfundingFixture);
          const contributionAmount = ethers.parseEther("1"); // Below threshold
          
          await crowdFunding.connect(addr1).contribute({ value: contributionAmount });
          
          expect(await rewardNFT.balanceOf(addr1.address)).to.equal(0);
          expect(await crowdFunding.hasReceivedNFT(addr1.address)).to.equal(false);
        });
    
        it("Should mint NFT if contribution meets threshold", async function () {
          const { crowdFunding, rewardNFT, addr1, NFT_THRESHOLD } = await loadFixture(deployCrowdfundingFixture);
          
          await crowdFunding.connect(addr1).contribute({ value: NFT_THRESHOLD });
          
          expect(await rewardNFT.balanceOf(addr1.address)).to.equal(1);
          expect(await crowdFunding.hasReceivedNFT(addr1.address)).to.equal(true);
        });
    
        it("Should mint NFT if cumulative contributions meet threshold", async function () {
          const { crowdFunding, rewardNFT, addr1, NFT_THRESHOLD } = await loadFixture(deployCrowdfundingFixture);
          const halfThreshold = NFT_THRESHOLD / BigInt(2);
          
          // First contribution - below threshold
          await crowdFunding.connect(addr1).contribute({ value: halfThreshold });
          expect(await rewardNFT.balanceOf(addr1.address)).to.equal(0);
          
          // Second contribution - cumulative meets threshold
          await crowdFunding.connect(addr1).contribute({ value: halfThreshold });
          expect(await rewardNFT.balanceOf(addr1.address)).to.equal(1);
        });
    
        it("Should not mint additional NFTs for further contributions", async function () {
          const { crowdFunding, rewardNFT, addr1, NFT_THRESHOLD } = await loadFixture(deployCrowdfundingFixture);
          
          // First contribution - meets threshold
          await crowdFunding.connect(addr1).contribute({ value: NFT_THRESHOLD });
          expect(await rewardNFT.balanceOf(addr1.address)).to.equal(1);
          
          // Second contribution - should not mint another NFT
          await crowdFunding.connect(addr1).contribute({ value: NFT_THRESHOLD });
          expect(await rewardNFT.balanceOf(addr1.address)).to.equal(1);
        });
    
        it("Should emit NFTRewardSent event", async function () {
          const { crowdFunding, addr1, NFT_THRESHOLD } = await loadFixture(deployCrowdfundingFixture);
          
          await expect(
            crowdFunding.connect(addr1).contribute({ value: NFT_THRESHOLD })
          ).to.emit(crowdFunding, "NFTRewardSent")
            .withArgs(addr1.address, 0); // First NFT should have ID 0
        });
      });
    
      // Test funding goal tracking
      describe("Funding Goal", function () {
        it("Should track funding progress correctly", async function () {
          const { crowdFunding, addr1, goal } = await loadFixture(deployCrowdfundingFixture);
          const halfGoal = goal / BigInt(2);
          
          // First contribution - half the goal
          await crowdFunding.connect(addr1).contribute({ value: halfGoal });
          expect(await crowdFunding.totalFundsRaised()).to.equal(halfGoal);
          expect(await crowdFunding.isFundingComplete()).to.equal(false);
          
          // Second contribution - reaches the goal
          await crowdFunding.connect(addr1).contribute({ value: halfGoal });
          expect(await crowdFunding.totalFundsRaised()).to.equal(goal);
          expect(await crowdFunding.isFundingComplete()).to.equal(true);
        });
      });
    
      // Test fund withdrawal
      describe("Fund Withdrawal", function () {
        it("Should allow owner to withdraw funds when goal is reached", async function () {
          const { crowdFunding, owner, addr1, goal } = await loadFixture(deployCrowdfundingFixture);
          
          // Reach funding goal
          await crowdFunding.connect(addr1).contribute({ value: goal });
          
          // Check owner can withdraw
          await expect(
            crowdFunding.connect(owner).withdrawFunds()
          ).to.changeEtherBalance(owner, goal);
          
          // Check contract balance after withdrawal
          expect(await ethers.provider.getBalance(crowdFunding.target)).to.equal(0);
        });
    
        it("Should emit FundsWithdrawn event", async function () {
          const { crowdFunding, owner, addr1, goal } = await loadFixture(deployCrowdfundingFixture);
          
          // Reach funding goal
          await crowdFunding.connect(addr1).contribute({ value: goal });
          
          // Check event is emitted on withdrawal
          await expect(
            crowdFunding.connect(owner).withdrawFunds()
          ).to.emit(crowdFunding, "FundsWithdrawn")
            .withArgs(owner.address, goal);
        });
    
        it("Should reject withdrawal if funding goal not reached", async function () {
          const { crowdFunding, owner } = await loadFixture(deployCrowdfundingFixture);
          
          await expect(
            crowdFunding.connect(owner).withdrawFunds()
          ).to.be.revertedWith("Funding goal not yet reached");
        });
    
        it("Should reject withdrawal from non-owner", async function () {
          const { crowdFunding, addr1, goal } = await loadFixture(deployCrowdfundingFixture);
          
          // Reach funding goal
          await crowdFunding.connect(addr1).contribute({ value: goal });
          
          // Try to withdraw as non-owner
          await expect(
            crowdFunding.connect(addr1).withdrawFunds()
          ).to.be.revertedWith("Only project owner can withdraw");
        });
      });
    
      // Test contribution tracking
      describe("Contribution Tracking", function () {
        it("Should correctly track individual contributions", async function () {
          const { crowdFunding, addr1, addr2 } = await loadFixture(deployCrowdfundingFixture);
          
          const amount1 = ethers.parseEther("5");
          const amount2 = ethers.parseEther("7");
          
          await crowdFunding.connect(addr1).contribute({ value: amount1 });
          await crowdFunding.connect(addr2).contribute({ value: amount2 });
          
          expect(await crowdFunding.getContribution(addr1.address)).to.equal(amount1);
          expect(await crowdFunding.getContribution(addr2.address)).to.equal(amount2);
        });
    
        it("Should update contribution amounts for repeat contributors", async function () {
          const { crowdFunding, addr1 } = await loadFixture(deployCrowdfundingFixture);
          
          const amount1 = ethers.parseEther("3");
          const amount2 = ethers.parseEther("4");
          const totalExpected = amount1 + amount2;
          
          await crowdFunding.connect(addr1).contribute({ value: amount1 });
          await crowdFunding.connect(addr1).contribute({ value: amount2 });
          
          expect(await crowdFunding.getContribution(addr1.address)).to.equal(totalExpected);
        });
      });
    });

    describe("Validations", () => {
      describe("Contribute Validations", () => {
        it("Should reject contributions of 0 value", async function () {
          const { crowdFunding, addr1 } = await loadFixture(deployCrowdfundingFixture);
          
          await expect(
            crowdFunding.connect(addr1).contribute({ value: 0 })
          ).to.be.revertedWith("Contribution must be greater than 0");
        });

        it("Should reject contributions after funding goal is reached", async function () {
          const { crowdFunding, addr1, addr2, goal } = await loadFixture(deployCrowdfundingFixture);
          
          // Contribute to reach the funding goal
          await crowdFunding.connect(addr1).contribute({ value: goal });
          
          // attempt to contribute after goal is reached
          await expect(
            crowdFunding.connect(addr2).contribute({ value: ethers.parseEther("0.00001") })
          ).to.be.revertedWith("Funding goal already reached");
          expect( await crowdFunding.totalFundsRaised() 
        ) .to.eq(await crowdFunding.FUNDING_GOAL());

      
        
        });


       
      });

      describe("Withdraw Validations", () => {
      
      });
    });
    

    
  });