import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV, buffCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_NAME = 101;
const ERR_INVALID_DESCRIPTION = 102;
const ERR_INVALID_PROOF_HASH = 103;
const ERR_INVALID_CATEGORY = 109;
const ERR_INVALID_LOCATION = 110;
const ERR_INVALID_CURRENCY = 111;
const ERR_INVALID_MIN_DONATION = 112;
const ERR_INVALID_MAX_GOAL = 113;
const ERR_CHARITY_ALREADY_EXISTS = 105;
const ERR_CHARITY_NOT_FOUND = 106;
const ERR_MAX_CHARITIES_EXCEEDED = 116;
const ERR_INVALID_CHARITY_TYPE = 117;
const ERR_INVALID_CONTACT_INFO = 118;
const ERR_INVALID_REGISTRATION_FEE = 119;
const ERR_INVALID_VERIFICATION_LEVEL = 120;
const ERR_AUTHORITY_NOT_VERIFIED = 108;
const ERR_INVALID_UPDATE_PARAM = 115;

interface Charity {
  name: string;
  description: string;
  proofHash: Uint8Array;
  category: string;
  location: string;
  currency: string;
  minDonation: number;
  maxGoal: number;
  timestamp: number;
  creator: string;
  charityType: string;
  contactInfo: string;
  status: boolean;
  verificationLevel: number;
}

interface CharityUpdate {
  updateName: string;
  updateDescription: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class CharityRegistryMock {
  state: {
    nextCharityId: number;
    maxCharities: number;
    registrationFee: number;
    authorityContract: string | null;
    charities: Map<number, Charity>;
    charityUpdates: Map<number, CharityUpdate>;
    charitiesByName: Map<string, number>;
  } = {
    nextCharityId: 0,
    maxCharities: 5000,
    registrationFee: 500,
    authorityContract: null,
    charities: new Map(),
    charityUpdates: new Map(),
    charitiesByName: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextCharityId: 0,
      maxCharities: 5000,
      registrationFee: 500,
      authorityContract: null,
      charities: new Map(),
      charityUpdates: new Map(),
      charitiesByName: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setRegistrationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.registrationFee = newFee;
    return { ok: true, value: true };
  }

  registerCharity(
    name: string,
    description: string,
    proofHash: Uint8Array,
    category: string,
    location: string,
    currency: string,
    minDonation: number,
    maxGoal: number,
    charityType: string,
    contactInfo: string,
    verificationLevel: number
  ): Result<number> {
    if (this.state.nextCharityId >= this.state.maxCharities) return { ok: false, value: ERR_MAX_CHARITIES_EXCEEDED };
    if (!name || name.length > 100) return { ok: false, value: ERR_INVALID_NAME };
    if (!description || description.length > 500) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (proofHash.length !== 32) return { ok: false, value: ERR_INVALID_PROOF_HASH };
    if (!category || category.length > 50) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (minDonation <= 0) return { ok: false, value: ERR_INVALID_MIN_DONATION };
    if (maxGoal <= 0) return { ok: false, value: ERR_INVALID_MAX_GOAL };
    if (!["non-profit", "community", "environmental"].includes(charityType)) return { ok: false, value: ERR_INVALID_CHARITY_TYPE };
    if (contactInfo.length > 200) return { ok: false, value: ERR_INVALID_CONTACT_INFO };
    if (verificationLevel > 5) return { ok: false, value: ERR_INVALID_VERIFICATION_LEVEL };
    if (!this.isVerifiedAuthority(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.charitiesByName.has(name)) return { ok: false, value: ERR_CHARITY_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.registrationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextCharityId;
    const charity: Charity = {
      name,
      description,
      proofHash,
      category,
      location,
      currency,
      minDonation,
      maxGoal,
      timestamp: this.blockHeight,
      creator: this.caller,
      charityType,
      contactInfo,
      status: true,
      verificationLevel,
    };
    this.state.charities.set(id, charity);
    this.state.charitiesByName.set(name, id);
    this.state.nextCharityId++;
    return { ok: true, value: id };
  }

  getCharity(id: number): Charity | null {
    return this.state.charities.get(id) || null;
  }

  updateCharity(id: number, updateName: string, updateDescription: string): Result<boolean> {
    const charity = this.state.charities.get(id);
    if (!charity) return { ok: false, value: false };
    if (charity.creator !== this.caller) return { ok: false, value: false };
    if (!updateName || updateName.length > 100) return { ok: false, value: false };
    if (!updateDescription || updateDescription.length > 500) return { ok: false, value: false };
    if (this.state.charitiesByName.has(updateName) && this.state.charitiesByName.get(updateName) !== id) {
      return { ok: false, value: false };
    }

    const updated: Charity = {
      ...charity,
      name: updateName,
      description: updateDescription,
      timestamp: this.blockHeight,
    };
    this.state.charities.set(id, updated);
    this.state.charitiesByName.delete(charity.name);
    this.state.charitiesByName.set(updateName, id);
    this.state.charityUpdates.set(id, {
      updateName,
      updateDescription,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getCharityCount(): Result<number> {
    return { ok: true, value: this.state.nextCharityId };
  }

  checkCharityExistence(name: string): Result<boolean> {
    return { ok: true, value: this.state.charitiesByName.has(name) };
  }
}

describe("CharityRegistry", () => {
  let contract: CharityRegistryMock;

  beforeEach(() => {
    contract = new CharityRegistryMock();
    contract.reset();
  });

  it("registers a charity successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = new Uint8Array(32).fill(0);
    const result = contract.registerCharity(
      "HelpFund",
      "Aid for all",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact@helpfund.org",
      3
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const charity = contract.getCharity(0);
    expect(charity?.name).toBe("HelpFund");
    expect(charity?.description).toBe("Aid for all");
    expect(charity?.category).toBe("health");
    expect(charity?.location).toBe("Global");
    expect(charity?.currency).toBe("STX");
    expect(charity?.minDonation).toBe(10);
    expect(charity?.maxGoal).toBe(10000);
    expect(charity?.charityType).toBe("non-profit");
    expect(charity?.contactInfo).toBe("contact@helpfund.org");
    expect(charity?.verificationLevel).toBe(3);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate charity names", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = new Uint8Array(32).fill(0);
    contract.registerCharity(
      "HelpFund",
      "Aid for all",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact@helpfund.org",
      3
    );
    const result = contract.registerCharity(
      "HelpFund",
      "New aid",
      proofHash,
      "education",
      "Local",
      "USD",
      20,
      20000,
      "community",
      "info@helpfund.org",
      4
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_CHARITY_ALREADY_EXISTS);
  });

  it("rejects non-authorized caller", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.authorities = new Set();
    const proofHash = new Uint8Array(32).fill(0);
    const result = contract.registerCharity(
      "HelpFund",
      "Aid for all",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact@helpfund.org",
      3
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects registration without authority contract", () => {
    const proofHash = new Uint8Array(32).fill(0);
    const result = contract.registerCharity(
      "NoAuth",
      "No aid",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact@noauth.org",
      3
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid name", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = new Uint8Array(32).fill(0);
    const result = contract.registerCharity(
      "",
      "Aid for all",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact@helpfund.org",
      3
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_NAME);
  });

  it("rejects invalid description", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = new Uint8Array(32).fill(0);
    const result = contract.registerCharity(
      "HelpFund",
      "",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact@helpfund.org",
      3
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DESCRIPTION);
  });

  it("rejects invalid proof hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = new Uint8Array(31).fill(0);
    const result = contract.registerCharity(
      "HelpFund",
      "Aid for all",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact@helpfund.org",
      3
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PROOF_HASH);
  });

  it("rejects invalid charity type", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = new Uint8Array(32).fill(0);
    const result = contract.registerCharity(
      "HelpFund",
      "Aid for all",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "invalid",
      "contact@helpfund.org",
      3
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CHARITY_TYPE);
  });

  it("updates a charity successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = new Uint8Array(32).fill(0);
    contract.registerCharity(
      "OldCharity",
      "Old desc",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact@old.org",
      3
    );
    const result = contract.updateCharity(0, "NewCharity", "New desc");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const charity = contract.getCharity(0);
    expect(charity?.name).toBe("NewCharity");
    expect(charity?.description).toBe("New desc");
    const update = contract.state.charityUpdates.get(0);
    expect(update?.updateName).toBe("NewCharity");
    expect(update?.updateDescription).toBe("New desc");
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent charity", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateCharity(99, "NewCharity", "New desc");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = new Uint8Array(32).fill(0);
    contract.registerCharity(
      "HelpFund",
      "Aid for all",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact@helpfund.org",
      3
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateCharity(0, "NewCharity", "New desc");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets registration fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setRegistrationFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.registrationFee).toBe(1000);
    const proofHash = new Uint8Array(32).fill(0);
    contract.registerCharity(
      "HelpFund",
      "Aid for all",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact@helpfund.org",
      3
    );
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects registration fee change without authority contract", () => {
    const result = contract.setRegistrationFee(1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct charity count", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = new Uint8Array(32).fill(0);
    contract.registerCharity(
      "Charity1",
      "Desc1",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact1.org",
      3
    );
    contract.registerCharity(
      "Charity2",
      "Desc2",
      proofHash,
      "education",
      "Local",
      "USD",
      20,
      20000,
      "community",
      "contact2.org",
      4
    );
    const result = contract.getCharityCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks charity existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = new Uint8Array(32).fill(0);
    contract.registerCharity(
      "HelpFund",
      "Aid for all",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact@helpfund.org",
      3
    );
    const result = contract.checkCharityExistence("HelpFund");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkCharityExistence("NonExistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects charity registration with empty name", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = new Uint8Array(32).fill(0);
    const result = contract.registerCharity(
      "",
      "Aid for all",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact@helpfund.org",
      3
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_NAME);
  });

  it("rejects charity registration with max charities exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxCharities = 1;
    const proofHash = new Uint8Array(32).fill(0);
    contract.registerCharity(
      "Charity1",
      "Desc1",
      proofHash,
      "health",
      "Global",
      "STX",
      10,
      10000,
      "non-profit",
      "contact1.org",
      3
    );
    const result = contract.registerCharity(
      "Charity2",
      "Desc2",
      proofHash,
      "education",
      "Local",
      "USD",
      20,
      20000,
      "community",
      "contact2.org",
      4
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_CHARITIES_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});