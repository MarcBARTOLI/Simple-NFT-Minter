const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require('merkletreejs');
const { keccak256 } = ethers.utils;

describe("Dev mint", function () {
  let contract;
  let owner, buyer1;

  beforeEach(async () => {
    const Contract = await ethers.getContractFactory("Contract");
    contract = await Contract.deploy();
    await contract.deployed();

    [owner, buyer1] = await ethers.getSigners()
  });

  it("Should mint the correct amount of nfts for the owner", async function () {
    await contract.devMint(10);

    expect(await contract.balanceOf(owner.address)).to.equal(10);
  });

  it("Should be only callable by the owner", async function () {
    const tx = contract.connect(buyer1).devMint(10);

    await expect(tx).to.be.reverted;
  });

  it("Should not be able to mint more than the reserved supply", async function () {
    const tx = contract.devMint(150);

    await expect(tx).to.be.revertedWith('ExceedSupply');
  });
});

describe("Minting before start", function () {
  let contract;
  
  beforeEach(async () => {
    const Contract = await ethers.getContractFactory("Contract");
    contract = await Contract.deploy();
    await contract.deployed();
  });

  it("Public mint - Should not be able to mint before sale has started", async function () {
    const tx =  contract.mint(1,
        {value: ethers.utils.parseEther("999")});

    await expect(tx).to.be.revertedWith('PublicMintNotStarted');
  });

  it("Presale mint - Should not be able to mint before presale has started", async function () {
    const tx =  contract.privateMint([], 1,
       {value: ethers.utils.parseEther("999")});

    await expect(tx).to.be.revertedWith('PrivateMintNotStarted');
  });
});

describe("Presale mint", function () {
  let contract;
  var proof, falseProof;

  beforeEach(async () => {
    const hreAccounts = await ethers.getSigners();
    const whitelisteds = hreAccounts.slice(0, 5);
    const notWhitelisteds = hreAccounts.slice(5, 10);
    whitelisted = whitelisteds[0];
    notWhitelisted = notWhitelisteds[0];

    const leaves = whitelisteds.map(account => keccak256(account.address));
    const tree = new MerkleTree(leaves, keccak256, { sort: true });
    const merkleRoot = tree.getHexRoot();

    const Contract = await ethers.getContractFactory("Contract");
    contract = await Contract.deploy();
    await contract.deployed();

    await contract.setPresaleMerkleRoot(merkleRoot);
    await contract.startPrivateMint();

    proof = tree.getHexProof(keccak256(whitelisted.address));
    falseProof = tree.getHexProof(keccak256(notWhitelisted.address));
  });

  it("Should mint the correct amount of nfts for whitelisted addresses", async function () {
    await contract.connect(whitelisted).privateMint(proof, 2,
       {value: ethers.utils.parseEther("999")});

    expect(await contract.balanceOf(whitelisted.address)).to.equal(2);
  });

  it("Should not be able to mint if payment is insufficient", async function () {
    const tx =  contract.connect(whitelisted).privateMint(proof, 1,
       {value: ethers.utils.parseEther("0")});

    await expect(tx).to.be.revertedWith('InsufficientPayment');
  });

  it("Should not be able to mint more than the reserved supply", async function () {
    //Setting max per wallet to high value so our account can mint a lot
    await contract.setPresaleMaxItemsPerWallet(250);

    const tx =  contract.connect(whitelisted).privateMint(proof, 250,
      {value: ethers.utils.parseEther("999")});
 
    await expect(tx).to.be.revertedWith('ExceedSupply');
  });

  it("Should not be able to mint more than max allowed per wallet", async function () {
    await contract.setPresaleMaxItemsPerWallet(5);

    const tx = contract.connect(whitelisted).privateMint(proof, 10,
       {value: ethers.utils.parseEther("999")});

    await expect(tx).to.be.revertedWith('ExceedMaxPerWallet');
  });

  it("Should not be able to mint for not whitelisted addresses", async function () {
    const tx = contract.connect(notWhitelisted).privateMint(falseProof, 1,
       {value: ethers.utils.parseEther("999")});

    await expect(tx).to.be.revertedWith('NotInWhitelist');
  });
});

describe("Public mint", function () {
  let contract;
  let owner, buyer1;
  
  beforeEach(async () => {
    const Contract = await ethers.getContractFactory("Contract");
    contract = await Contract.deploy();
    await contract.deployed();
    await contract.startPublicMint();

    [owner, buyer1] = await ethers.getSigners()
  });

  it("Should mint the correct amount of nfts", async function () {
    await contract.connect(buyer1).mint(10,
      {value: ethers.utils.parseEther("999")});

    expect(await contract.balanceOf(buyer1.address)).to.equal(10);
  });

  it("Should not be able to mint if payment is insufficient", async function () {
    await contract.setMintPrice(ethers.utils.parseEther("2"));

    const tx = contract.connect(buyer1).mint(1,
      {value: ethers.utils.parseEther("1")});

    await expect(tx).to.be.revertedWith('InsufficientPayment');
  });

  it("Should not be able to mint more than the whole collection", async function () {
    //Setting price to very low value so our account can mint a lot
    await contract.setMintPrice(ethers.utils.parseEther("0.001"));

    //Mint the first 9800 
    for (let index = 0; index < 49; index++) {
      await contract.mint(200,
        {value: ethers.utils.parseEther("1")});  
    }

    //Try to mint 250 more
    //(total minted = 10050)
    const tx = contract.connect(buyer1).mint(250,
      {value: ethers.utils.parseEther("999")});

    await expect(tx).to.be.revertedWith('ExceedSupply');
  });
});

describe("Whithdraw", function () {
  let contract;
  let owner, buyer1;

  beforeEach(async () => {
    const Contract = await ethers.getContractFactory("Contract");
    contract = await Contract.deploy();
    await contract.deployed();
    await contract.startPublicMint();

    [owner, buyer1] = await ethers.getSigners()
  });

  it("Should be only callable by the owner", async function () {
    const tx =  contract.connect(buyer1).withdraw();

    await expect(tx).to.be.reverted;
  });

  it("Should transfer the contract balance to owner wallet", async function () {
    var weiSpent = ethers.utils.parseEther("10");
    var oldOwnerBalance = toRoundedEther(await owner.getBalance());

    await contract.connect(buyer1).mint(1, {value: weiSpent})
    await contract.connect(owner).withdraw();

    var newOwnerBalance = toRoundedEther(await owner.getBalance());

    expect(newOwnerBalance).to.equal(oldOwnerBalance + toRoundedEther(weiSpent));
  });

  //Rounding values because we are too lazy to also calculate the gas fees
  function toRoundedEther(wei) {
    return Math.round(Number.parseFloat(ethers.utils.formatEther(wei)));
  }
});
