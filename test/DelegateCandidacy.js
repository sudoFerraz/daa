import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const assertJump = require('zeppelin-solidity/test/helpers/assertJump');

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const DelegateCandidacy = artifacts.require('DelegateCandidacy.sol');

contract('DelegateCandidacy', function(accounts) {

    let delegateCandidacy;
    let gaDate;

    const delegate = accounts[0];
    const newMember = accounts[2];
    const newWhitelister1 = accounts[3];
    const newWhitelister2 = accounts[4];

    // const name = "test";
    const amount = new web3.BigNumber(web3.toWei(1, 'ether'));
    // const destinationAddress = accounts[5];
    const prGADuration = duration.days(14);
    // const extendedDuration = 120; // 2 mins in seconds

    const nonMember = accounts[6];

    const newDAO = accounts[7];


    before(async function() {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async function() {
        delegateCandidacy = await DelegateCandidacy.new();

        await delegateCandidacy.requestMembership({from: newMember});

        await delegateCandidacy.addWhitelister(newWhitelister1, {from: delegate});
        await delegateCandidacy.addWhitelister(newWhitelister2, {from: delegate});

        await delegateCandidacy.whitelistMember(newMember, {from: newWhitelister1});
        await delegateCandidacy.whitelistMember(newMember, {from: newWhitelister2});

        await delegateCandidacy.payMembership({from: newMember, value: amount});


        gaDate = latestTime() + duration.weeks(10);
        await delegateCandidacy.proposeGeneralAssemblyDate(gaDate, {from: newMember});
        await delegateCandidacy.voteForGeneralAssemblyDate(0, true, {from: newMember});

        const endTime =   latestTime() + prGADuration;
        const afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);

        // after the voting time has expired => concludeGeneralAssemblyVote
        await delegateCandidacy.voteForGeneralAssemblyDate(0, true, {from: newWhitelister1});


        // const proposal = await delegateCandidacy.getGADateProposal(0);
        // proposal[8].should.equal(true); // concluded
        // proposal[9].should.equal(true); // result

        // const ga = await delegateCandidacy.getCurrentGA();
        // console.log(ga[0].toString());
        // console.log(ga[1].toString());
        // console.log(ga[2]);

        // await increaseTimeTo(gaDate);

        // const finishGADate = gaDate + duration.days(10);
        // await increaseTimeTo(finishGADate);

        // await delegateCandidacy.finishCurrentGeneralAssembly({from: delegate});

    });

    it('should propose Delegate Candidacy', async function() {
        await increaseTimeTo(gaDate);

        await delegateCandidacy.proposeDelegateCandidacy({from: newMember});
        const proposal = await delegateCandidacy.getDelegateCandidacyProposal(0);
        proposal[0].should.equal(newMember); // submitter

        proposal[3].should.equal(newMember); // destinationAddress
    });

    it('should propose Delegate Candidacy (from non-member)', async function() {
        await increaseTimeTo(gaDate);

        try {
            await delegateCandidacy.proposeDelegateCandidacy({from: nonMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should propose Delegate Candidacy (not during GA)', async function() {
        // await increaseTimeTo(gaDate);

        try {
            await delegateCandidacy.proposeDelegateCandidacy({from: newMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });


    it('should vote for Delegate Candidacy', async function() {
        await increaseTimeTo(gaDate);

        await delegateCandidacy.proposeDelegateCandidacy({from: newMember});

        await delegateCandidacy.voteForDelegate(0, {from: newMember});

        const proposal = await delegateCandidacy.getDelegateCandidacyProposal(0);

        proposal[6].should.be.bignumber.equal(1); // votesFor
        proposal[7].should.be.bignumber.equal(0); // votesAgainst

        // proposal[8].should.equal(false); // concluded
    });

    it('should vote for Delegate Candidacy (1 member votes for 2 candidates)', async function() {
        await increaseTimeTo(gaDate);

        await delegateCandidacy.proposeDelegateCandidacy({from: newMember});
        await delegateCandidacy.proposeDelegateCandidacy({from: newWhitelister1});

        await delegateCandidacy.voteForDelegate(0, {from: newMember}); // newMember votes for newMember

        try {
            await delegateCandidacy.voteForDelegate(1, {from: newMember}); // newMember votes for newWhitelister1
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });


    it('should conclude vote for Delegate Candidacy', async function() {
        // TODO:


    });

});
