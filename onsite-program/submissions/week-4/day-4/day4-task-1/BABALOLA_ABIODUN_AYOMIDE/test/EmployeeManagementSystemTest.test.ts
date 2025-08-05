import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";
import {Contract} from "ethers";


let name: string ="";
let role : number=0;
const validName = "Valid NAme";

describe("EmployeeManagementSystem", function () {
  let contract: any;
  let owner: any;
  let acc1: any, acc2: any, acc3: any, acc4: any;
  enum Position {MEDIA_TEAM, MENTOR, MANAGER, SOCIAL_MEDIA_TEAM, TECHNICIAN_SUPERVISOR, KITCHEN_STAFF }

  beforeEach(async function () {
    [owner, acc1, acc2, acc3,acc4] = await hre.ethers.getSigners();
    const Factory = await hre.ethers.getContractFactory("EmployeeManagementSystem");
    contract = await Factory.deploy();
  });

  async function deployContract() {
    const [owner, acc1,acc2, acc3, acc4] = await hre.ethers.getSigners();
    const EmployeeManagementSystem = await hre.ethers.getContractFactory("EmployeeManagementSystem");
    const deployedContract = await EmployeeManagementSystem.deploy();
    return { deployedContract, acc1, acc2, acc3,owner, acc4 };
  }

  describe("Tests inputs",()=>{
    it("test user registration",async ()=>{
      const {deployedContract,acc1} = await deployContract();
      await expect(deployedContract.addEmployee(acc1,name,role)).to.be.revertedWithCustomError(deployedContract,"INVALID_DATA_PASSED()")
      let allEmployees =  await deployedContract.getAllEmployees();
      expect(allEmployees.length).to.equal(0);
      name="valid name"
      await deployedContract.addEmployee(acc1.address,name,role)
      allEmployees =  await deployedContract.getAllEmployees();
      expect(allEmployees.length).to.equal(1);
    })
  })

  describe("employee sack and re-employing",()=>{
    it("tests user not employed cannot be sacked",async()=>{
      const {deployedContract,acc1} = await deployContract();
      await expect(deployedContract.toggleEmploymentStatus(acc1.address)).to.be.revertedWithCustomError(deployedContract,"INVALID_DATA_PASSED()")
    })
    it("tests user Employee can be sacked", async ()=>{
      const {deployedContract, acc2} = await deployContract();
      await deployedContract.addEmployee(acc2.address,validName,role);
      await deployedContract.toggleEmploymentStatus(acc2.address);
      const employee = await deployedContract.getEmployeeByAddress(acc2.address);
      expect(employee.isEmployed).to.equal(false)
    })
    it("tests user Employee can be sacked and reEmployed", async ()=>{
      const {deployedContract, acc2} = await deployContract();
      await deployedContract.addEmployee(acc2.address,validName,role);
      await deployedContract.toggleEmploymentStatus(acc2.address);
      let employee = await deployedContract.getEmployeeByAddress(acc2.address);
      expect(employee.isEmployed).to.equal(false)
      await deployedContract.toggleEmploymentStatus(acc2.address);
      employee = await deployedContract.getEmployeeByAddress(acc2.address)
      expect(employee.isEmployed).to.equal(true)
    })
  })

  describe("Garage Access Logic", function () {
    it("should return true for employed MEDIA_TEAM", async () => {
      await contract.addEmployee(acc1.address, "Media", Position.MEDIA_TEAM);
      const canAccess = await contract.canAccessGarage(acc1.address);
      expect(canAccess).to.equal(true);
    });

    it("should return true for employed MENTOR", async () => {
      await contract.addEmployee(acc2.address, "Mentor", Position.MENTOR);
      const canAccess = await contract.canAccessGarage(acc2.address);
      expect(canAccess).to.equal(true);
    });

    it("should return true for employed MANAGER", async () => {
      await contract.addEmployee(acc1.address, "Manager", Position.MANAGER);
      const canAccess = await contract.canAccessGarage(acc1.address);
      expect(canAccess).to.equal(true);
    });

    it("should return false for SOCIAL_MEDIA_TEAM", async () => {
      await contract.addEmployee(acc1.address, "SOCIAL_MEDIA_TEAM", Position.SOCIAL_MEDIA_TEAM);
      await contract.toggleEmploymentStatus(acc1.address);
      const canAccess = await contract.canAccessGarage(acc1.address);
      expect(canAccess).to.equal(false);
    });

    it("should return false if employee is sacked", async () => {
      await contract.addEmployee(acc1.address, "SOCIAL_MEDIA_TEAM", Position.SOCIAL_MEDIA_TEAM);
      const canAccess = await contract.canAccessGarage(acc1.address);
      expect(canAccess).to.equal(false);
    });

    it("should return false for unknown address", async () => {
      const canAccess = await contract.canAccessGarage(acc1.address);
      expect(canAccess).to.equal(false);
    });
  });

  describe("",function (){
    it("should return employee struct when employee is found", async () => {
      await contract.addEmployee(acc1.address, "Test Employee", Position.MANAGER);
      const employee = await contract.getEmployeeByAddress(acc1.address);
      expect(employee.employeeAddress).to.equal(acc1.address);
      expect(employee.name).to.equal("Test Employee");
      expect(employee.role).to.equal(Position.MANAGER);
      expect(employee.isEmployed).to.equal(true);
    });

    it("should revert with INVALID_DATA_PASSED when employee is not found", async () => {
      await expect(contract.getEmployeeByAddress(acc2.address)).to.be.revertedWithCustomError(contract, "INVALID_DATA_PASSED");
    });
  })
  describe("updateEmployeeRole()", () => {

    it("should update the role of an existing employee", async () => {
      await contract.addEmployee(acc1.address, "Test Employee", Position.MEDIA_TEAM);
      await contract.updateEmployeeRole(acc1.address, Position.MANAGER);
      const employee = await contract.getEmployeeByAddress(acc1.address);

      expect(employee.role).to.equal(Position.MANAGER);
    });

    it("should revert if the employee does not exist", async () => {
      await expect(
          contract.updateEmployeeRole(acc2.address, Position.MANAGER)
      ).to.be.revertedWithCustomError(contract, "INVALID_DATA_PASSED");
    });
  });

  describe("updateEmployeeData()", () => {

    it("should update name and role of an existing employee", async () => {
      await contract.addEmployee(acc1.address, "Old Name", Position.SOCIAL_MEDIA_TEAM);

      await contract.updateEmployeeData(acc1.address, Position.MENTOR, "New Name");

      const employee = await contract.getEmployeeByAddress(acc1.address);
      expect(employee.name).to.equal("New Name");
      expect(employee.role).to.equal(Position.MENTOR);
    });

    it("should revert if employee does not exist", async () => {
      await expect(
          contract.updateEmployeeData(acc2.address, Position.MANAGER, "No One")
      ).to.be.revertedWithCustomError(contract, "INVALID_DATA_PASSED");
    });
  });

  describe("updateEmployee()", () => {
    it("should update name of an existing employee", async () => {
      await contract.addEmployee(acc1.address, "Old Name",Position.MENTOR);
      await contract.updateEmployees(acc1.address, "New Name");
      const employee = await contract.getEmployeeByAddress(acc1.address);
      expect(employee.name).to.equal("New Name");
      expect(employee.role).to.equal(Position.MENTOR);
    });

    it("should revert if employee does not exist", async () => {
      await expect(
          contract.updateEmployees(acc2.address, "No One")
      ).to.be.revertedWithCustomError(contract, "INVALID_DATA_PASSED");
    });
  });
});
