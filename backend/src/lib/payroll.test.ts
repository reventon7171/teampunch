import {
  dailyHours,
  hourlyRate,
  computeLateMinutes,
  isCheckInTooEarly,
  isCheckOutTooLate,
  shiftDateStr,
  lateDeductionHours,
  lateDeductionAmount,
  leaveDeductionAmount,
  isWeeklyDayOff,
  isDayOff,
  countAbsencesInRange,
  periodInfo,
  periodKeyFromDate,
  shiftPeriod,
  computePayroll,
  DEFAULT_PAYROLL_CONFIG,
  PayrollConfig,
  PayrollEmployee,
  AttendanceRecord,
  LeaveRecord,
  DayOffSwapRecord,
} from "./payroll";

describe("dailyHours / hourlyRate", () => {
  it("computes plain same-day shift hours", () => {
    expect(dailyHours({ workStart: "08:00", workEnd: "17:00" })).toBe(9);
  });

  it("handles a shift that crosses midnight", () => {
    // 17:50 -> 01:00 next day = 7h10m
    expect(dailyHours({ workStart: "17:50", workEnd: "01:00" })).toBeCloseTo(7 + 10 / 60, 5);
  });

  it("derives hourly rate from base salary / 30 / daily hours", () => {
    const emp = { baseSalary: 18000, workStart: "08:00", workEnd: "17:00" };
    // 18000/30 = 600/day, /9h = 66.666.../hr
    expect(hourlyRate(emp)).toBeCloseTo(600 / 9, 5);
  });
});

describe("computeLateMinutes", () => {
  it("returns 0 when on time or early", () => {
    expect(computeLateMinutes("09:00", "09:00")).toBe(0);
    expect(computeLateMinutes("09:00", "08:55")).toBe(0);
  });

  it("counts even a single minute late", () => {
    expect(computeLateMinutes("09:00", "09:01")).toBe(1);
  });

  it("handles overnight shifts without wrapping incorrectly", () => {
    // shift starts 17:50, checking in at 17:55 is 5 min late, same evening
    expect(computeLateMinutes("17:50", "17:55")).toBe(5);
    // shift starts 23:50; checking in at 00:05 is naturally past midnight but only 15 min late,
    // not (incorrectly) treated as ~23h45m early
    expect(computeLateMinutes("23:50", "00:05")).toBe(15);
  });
});

describe("isCheckInTooEarly", () => {
  it("allows check-in exactly at the 30-minute early boundary", () => {
    expect(isCheckInTooEarly("17:50", "17:20")).toBe(false);
  });

  it("blocks check-in more than 30 minutes early", () => {
    expect(isCheckInTooEarly("17:50", "17:19")).toBe(true);
    expect(isCheckInTooEarly("17:50", "08:00")).toBe(true);
  });

  it("allows on-time or late check-in", () => {
    expect(isCheckInTooEarly("17:50", "17:50")).toBe(false);
    expect(isCheckInTooEarly("17:50", "18:30")).toBe(false);
  });

  it("handles a shift starting just after midnight — checking in a bit before it is still 'early', not treated as ~23h premature", () => {
    // shift starts 00:10; checking in at 23:45 the prior evening is 25 min early
    expect(isCheckInTooEarly("00:10", "23:45")).toBe(false);
    // 23:30 would be 40 min early — too early
    expect(isCheckInTooEarly("00:10", "23:30")).toBe(true);
  });
});

describe("isCheckOutTooLate", () => {
  it("allows checkout exactly at the 1-hour-late boundary, blocks past it", () => {
    // shift ends 01:00 (overnight), checkout at 02:00 is exactly +60 min — allowed
    expect(isCheckOutTooLate("01:00", "02:00")).toBe(false);
    // 02:01 is +61 min — too late
    expect(isCheckOutTooLate("01:00", "02:01")).toBe(true);
  });

  it("never blocks an early checkout, however early", () => {
    expect(isCheckOutTooLate("01:00", "18:00")).toBe(false); // leaving hours before an overnight shift even ends
  });

  it("blocks a same-day-shift checkout well past closing time", () => {
    expect(isCheckOutTooLate("18:00", "20:00")).toBe(true); // 2 hours late
    expect(isCheckOutTooLate("18:00", "18:45")).toBe(false); // 45 min late, within window
  });
});

describe("shiftDateStr", () => {
  it("moves a date backward and forward across a month boundary", () => {
    expect(shiftDateStr("2026-08-01", -1)).toBe("2026-07-31");
    expect(shiftDateStr("2026-07-31", 1)).toBe("2026-08-01");
  });

  it("moves a date across a year boundary", () => {
    expect(shiftDateStr("2027-01-01", -1)).toBe("2026-12-31");
  });
});

describe("lateDeductionHours", () => {
  it.each([
    [0, 0],
    [1, 1],
    [60, 1],
    [61, 2],
    [120, 2],
    [121, 3],
    [180, 3],
    [181, 4],
  ])("late %i minutes deducts %i hour(s)", (minutes, hours) => {
    expect(lateDeductionHours(minutes)).toBe(hours);
  });
});

describe("lateDeductionAmount", () => {
  it("falls back to hours x hourly rate when no org config is set", () => {
    expect(lateDeductionAmount(2, 66.67)).toBeCloseTo(133.34, 2);
    expect(lateDeductionAmount(0, 66.67)).toBe(0);
  });

  it("uses the flat first-hour amount once an admin configures it", () => {
    const config = { firstHourAmount: 50, perExtraHourAmount: 100 };
    expect(lateDeductionAmount(1, 66.67, config)).toBe(50);
    expect(lateDeductionAmount(2, 66.67, config)).toBe(150); // 50 + 1*100
    expect(lateDeductionAmount(3, 66.67, config)).toBe(250); // 50 + 2*100
  });

  it("repeats the first-hour amount for extra hours when perExtraHourAmount is left null", () => {
    const config = { firstHourAmount: 50, perExtraHourAmount: null };
    expect(lateDeductionAmount(3, 66.67, config)).toBe(150); // 50 * 3
  });

  it("still returns 0 for on-time (0 deduction hours) even with a flat config set", () => {
    const config = { firstHourAmount: 50, perExtraHourAmount: 100 };
    expect(lateDeductionAmount(0, 66.67, config)).toBe(0);
  });
});

describe("leaveDeductionAmount", () => {
  const emp: Pick<PayrollEmployee, "baseSalary"> = { baseSalary: 30000 }; // dailyRate = 1000

  it("sick leave deducts exactly one day's pay", () => {
    expect(leaveDeductionAmount(emp, { type: "SICK", date: "2026-08-10" })).toBe(1000);
  });

  it("personal leave Mon-Thu deducts 1.5x daily rate", () => {
    // 2026-08-10 is a Monday
    expect(leaveDeductionAmount(emp, { type: "PERSONAL", date: "2026-08-10" })).toBe(1500);
    // 2026-08-13 is a Thursday
    expect(leaveDeductionAmount(emp, { type: "PERSONAL", date: "2026-08-13" })).toBe(1500);
  });

  it("personal leave Fri-Sun deducts 2x daily rate", () => {
    // 2026-08-14 is a Friday
    expect(leaveDeductionAmount(emp, { type: "PERSONAL", date: "2026-08-14" })).toBe(2000);
    // 2026-08-16 is a Sunday
    expect(leaveDeductionAmount(emp, { type: "PERSONAL", date: "2026-08-16" })).toBe(2000);
  });

  it("vacation leave is unpaid deduction (paid leave)", () => {
    expect(leaveDeductionAmount(emp, { type: "VACATION", date: "2026-08-10" })).toBe(0);
  });
});

describe("isWeeklyDayOff", () => {
  it("matches the employee's configured day-off weekday", () => {
    // 2026-08-10 is Monday (getDay()=1)
    expect(isWeeklyDayOff({ daysOff: [1] }, "2026-08-10")).toBe(true);
    expect(isWeeklyDayOff({ daysOff: [2] }, "2026-08-10")).toBe(false);
  });
});

describe("isDayOff (with approved day-off swaps)", () => {
  // Monday off, hired long ago — 2026-08-10 is a Monday, 2026-08-12 is a Wednesday
  const emp: Pick<PayrollEmployee, "daysOff"> = { daysOff: [1] };

  it("falls back to the normal weekly pattern with no swaps", () => {
    expect(isDayOff(emp, "e1", "2026-08-10", [])).toBe(true);
    expect(isDayOff(emp, "e1", "2026-08-12", [])).toBe(false);
  });

  it("an approved swap turns the original off-day into a working day", () => {
    const swaps: DayOffSwapRecord[] = [
      { employeeId: "e1", originalOffDate: "2026-08-10", swappedToDate: "2026-08-12", status: "APPROVED" },
    ];
    expect(isDayOff(emp, "e1", "2026-08-10", swaps)).toBe(false);
  });

  it("an approved swap turns the swapped-to date into the day off", () => {
    const swaps: DayOffSwapRecord[] = [
      { employeeId: "e1", originalOffDate: "2026-08-10", swappedToDate: "2026-08-12", status: "APPROVED" },
    ];
    expect(isDayOff(emp, "e1", "2026-08-12", swaps)).toBe(true);
  });

  it("a PENDING swap has no effect — the normal weekly pattern still applies", () => {
    const swaps: DayOffSwapRecord[] = [
      { employeeId: "e1", originalOffDate: "2026-08-10", swappedToDate: "2026-08-12", status: "PENDING" },
    ];
    expect(isDayOff(emp, "e1", "2026-08-10", swaps)).toBe(true);
    expect(isDayOff(emp, "e1", "2026-08-12", swaps)).toBe(false);
  });

  it("ignores another employee's swap", () => {
    const swaps: DayOffSwapRecord[] = [
      { employeeId: "someone-else", originalOffDate: "2026-08-10", swappedToDate: "2026-08-12", status: "APPROVED" },
    ];
    expect(isDayOff(emp, "e1", "2026-08-10", swaps)).toBe(true);
  });
});

describe("countAbsencesInRange", () => {
  const emp: Pick<PayrollEmployee, "id" | "daysOff" | "hireDate"> = { id: "e1", daysOff: [0], hireDate: null }; // Sunday off, hired long ago

  it("does not count weekly days off, holidays, or approved leave days", () => {
    const attendance: AttendanceRecord[] = [];
    const holidays = [{ date: "2026-08-12", name: "Test holiday" }];
    const leaves: LeaveRecord[] = [
      { employeeId: "e1", date: "2026-08-13", type: "SICK", status: "APPROVED" },
    ];
    // Range Mon 2026-08-10 .. Fri 2026-08-14, "today" pinned past the range
    const count = countAbsencesInRange(
      emp,
      "2026-08-10",
      "2026-08-14",
      attendance,
      holidays,
      leaves,
      "2026-08-20"
    );
    // 10(Mon, no checkin -> absent), 11(Tue absent), 12(holiday, skip), 13(leave, skip), 14(Fri absent)
    expect(count).toBe(3);
  });

  it("does not count a day with a check-in as absent", () => {
    const attendance: AttendanceRecord[] = [
      {
        employeeId: "e1",
        date: "2026-08-10",
        checkInTime: "09:00",
        lateMinutes: 0,
        deductionAmount: 0,
      },
    ];
    const count = countAbsencesInRange(emp, "2026-08-10", "2026-08-10", attendance, [], [], "2026-08-20");
    expect(count).toBe(0);
  });

  it("caps the range at today so future days are never counted as absent", () => {
    const count = countAbsencesInRange(emp, "2026-08-10", "2026-08-31", [], [], [], "2026-08-12");
    // only 10 (Mon) and 11 (Tue) are evaluated; 12 itself is today and included
    expect(count).toBe(3);
  });

  it("does not count days before the employee's hireDate as absent (mid-month hire)", () => {
    // hired Wed 2026-08-12, range starts Mon 2026-08-10 (before they existed)
    const midMonthHire = { id: "e1", daysOff: [0], hireDate: "2026-08-12" };
    const count = countAbsencesInRange(midMonthHire, "2026-08-10", "2026-08-14", [], [], [], "2026-08-20");
    // 10, 11 skipped (not hired yet); 12(Wed absent), 13(Thu absent), 14(Fri absent)
    expect(count).toBe(3);
  });

  it("returns 0 when the employee was hired entirely after the range", () => {
    const notYetHired = { id: "e1", daysOff: [0], hireDate: "2026-09-01" };
    const count = countAbsencesInRange(notYetHired, "2026-08-01", "2026-08-15", [], [], [], "2026-08-20");
    expect(count).toBe(0);
  });

  it("an approved day-off swap counts the original off-day as absent if not worked, and the swapped-to day as not absent", () => {
    // Monday 2026-08-10 off normally; swapped to work Monday instead and take
    // Wednesday 2026-08-12 off — employee never checks in on either day
    const mondayOffEmp = { id: "e1", daysOff: [1], hireDate: null };
    const swaps: DayOffSwapRecord[] = [
      { employeeId: "e1", originalOffDate: "2026-08-10", swappedToDate: "2026-08-12", status: "APPROVED" },
    ];
    const count = countAbsencesInRange(mondayOffEmp, "2026-08-10", "2026-08-12", [], [], [], "2026-08-20", swaps);
    // 10(Mon, swapped to a working day, no checkin -> absent), 11(Tue, normal working day, absent),
    // 12(Wed, swapped-to day off -> skipped)
    expect(count).toBe(2);
  });
});

describe("period helpers — SEMI_MONTHLY (default config)", () => {
  it("periodKeyFromDate splits the month at day 15/16", () => {
    expect(periodKeyFromDate("2026-08-01", DEFAULT_PAYROLL_CONFIG)).toBe("2026-08-H1");
    expect(periodKeyFromDate("2026-08-15", DEFAULT_PAYROLL_CONFIG)).toBe("2026-08-H1");
    expect(periodKeyFromDate("2026-08-16", DEFAULT_PAYROLL_CONFIG)).toBe("2026-08-H2");
    expect(periodKeyFromDate("2026-08-31", DEFAULT_PAYROLL_CONFIG)).toBe("2026-08-H2");
  });

  it("periodInfo computes correct pay dates using the default 16th/1st schedule", () => {
    const h1 = periodInfo("2026-08-H1", DEFAULT_PAYROLL_CONFIG);
    expect(h1.startDate).toBe("2026-08-01");
    expect(h1.endDate).toBe("2026-08-15");
    expect(h1.payDate).toBe("2026-08-16");

    const h2 = periodInfo("2026-08-H2", DEFAULT_PAYROLL_CONFIG);
    expect(h2.startDate).toBe("2026-08-16");
    expect(h2.endDate).toBe("2026-08-31");
    expect(h2.payDate).toBe("2026-09-01"); // paid on the 1st of next month

    // December H2 rolls into January of the next year
    const dec = periodInfo("2026-12-H2", DEFAULT_PAYROLL_CONFIG);
    expect(dec.payDate).toBe("2027-01-01");
  });

  it("respects a custom semi-monthly pay day configuration", () => {
    const config: PayrollConfig = { ...DEFAULT_PAYROLL_CONFIG, semiMonthlyPayDay1: 20, semiMonthlyPayDay2: 5 };
    expect(periodInfo("2026-08-H1", config).payDate).toBe("2026-08-20");
    expect(periodInfo("2026-08-H2", config).payDate).toBe("2026-09-05");
  });

  it("shiftPeriod moves forward and backward across month/year boundaries", () => {
    expect(shiftPeriod("2026-08-H1", 1, DEFAULT_PAYROLL_CONFIG)).toBe("2026-08-H2");
    expect(shiftPeriod("2026-08-H2", 1, DEFAULT_PAYROLL_CONFIG)).toBe("2026-09-H1");
    expect(shiftPeriod("2026-01-H1", -1, DEFAULT_PAYROLL_CONFIG)).toBe("2025-12-H2");
  });
});

describe("period helpers — MONTHLY", () => {
  const config: PayrollConfig = { ...DEFAULT_PAYROLL_CONFIG, frequency: "MONTHLY", monthlyPayDay: 5 };

  it("periodKeyFromDate returns the calendar month", () => {
    expect(periodKeyFromDate("2026-08-17", config)).toBe("2026-08");
  });

  it("periodInfo covers the full calendar month, paid the configured day of the next month", () => {
    const info = periodInfo("2026-08", config);
    expect(info.startDate).toBe("2026-08-01");
    expect(info.endDate).toBe("2026-08-31");
    expect(info.payDate).toBe("2026-09-05");
  });

  it("shiftPeriod moves by whole months across a year boundary", () => {
    expect(shiftPeriod("2026-12", 1, config)).toBe("2027-01");
    expect(shiftPeriod("2027-01", -1, config)).toBe("2026-12");
  });
});

describe("period helpers — WEEKLY", () => {
  // payday = Friday (5)
  const config: PayrollConfig = { ...DEFAULT_PAYROLL_CONFIG, frequency: "WEEKLY", weeklyPayWeekday: 5 };

  it("periodKeyFromDate anchors every date in the block to that block's Friday", () => {
    // 2026-08-14 is a Friday
    expect(periodKeyFromDate("2026-08-14", config)).toBe("2026-08-14"); // Friday itself
    expect(periodKeyFromDate("2026-08-10", config)).toBe("2026-08-14"); // Monday same week
    expect(periodKeyFromDate("2026-08-15", config)).toBe("2026-08-21"); // Saturday rolls to next Friday
  });

  it("periodInfo covers the 7 days ending on the payday", () => {
    const info = periodInfo("2026-08-14", config);
    expect(info.startDate).toBe("2026-08-08");
    expect(info.endDate).toBe("2026-08-14");
    expect(info.payDate).toBe("2026-08-14");
  });

  it("shiftPeriod moves by exactly 7 days", () => {
    expect(shiftPeriod("2026-08-14", 1, config)).toBe("2026-08-21");
    expect(shiftPeriod("2026-08-14", -1, config)).toBe("2026-08-07");
  });
});

describe("computePayroll — SEMI_MONTHLY (default config)", () => {
  const emp: PayrollEmployee = {
    id: "e1",
    baseSalary: 30000, // periodSalary (H1/H2) = 15000, dailyRate = 1000
    workStart: "09:00",
    workEnd: "18:00",
    daysOff: [0], // Sunday
    hireDate: "2020-01-01", // hired long before any test period, so it never clamps anything below
  };

  it("pays half salary with no deductions on a clean H1 period", () => {
    const p = computePayroll(emp, "2026-08-H1", DEFAULT_PAYROLL_CONFIG, [], [], [], 0, 0, "2026-08-15");
    expect(p.periodSalary).toBe(15000);
    expect(p.lateDeduction).toBe(0);
    expect(p.leaveDeduction).toBe(0);
    expect(p.socialSecurityDeduction).toBe(0);
    expect(p.isCommissionPeriod).toBe(false);
    expect(p.commissionAmount).toBe(0); // commission ignored even if passed in on H1
    expect(p.net).toBe(15000);
  });

  it("applies late deduction only from records within the period", () => {
    const attendance: AttendanceRecord[] = [
      { employeeId: "e1", date: "2026-08-03", checkInTime: "09:30", lateMinutes: 30, deductionAmount: 111.11 },
      { employeeId: "e1", date: "2026-08-20", checkInTime: "09:30", lateMinutes: 30, deductionAmount: 111.11 }, // outside H1
    ];
    const p = computePayroll(emp, "2026-08-H1", DEFAULT_PAYROLL_CONFIG, attendance, [], [], 0, 0, "2026-08-15");
    expect(p.lateCount).toBe(1);
    expect(p.lateDeduction).toBeCloseTo(111.11, 2);
  });

  it("pays commission on H2 (the period covering the month's last day), not on H1", () => {
    const p2 = computePayroll(emp, "2026-08-H2", DEFAULT_PAYROLL_CONFIG, [], [], [], 0, 500, "2026-08-31");
    expect(p2.isCommissionPeriod).toBe(true);
    expect(p2.commissionAmount).toBe(500);

    const p1 = computePayroll(emp, "2026-08-H1", DEFAULT_PAYROLL_CONFIG, [], [], [], 0, 500, "2026-08-15");
    expect(p1.isCommissionPeriod).toBe(false);
    expect(p1.commissionAmount).toBe(0);
  });

  it("pro-rates half salary for an employee hired mid-period (started day 2 of a 15-day H1)", () => {
    // hired 2026-08-02: employed for 14 of the 15 days in H1 (Aug 1-15) -> 14/15 of half salary
    const midHireEmp: PayrollEmployee = { ...emp, hireDate: "2026-08-02" };
    const p = computePayroll(midHireEmp, "2026-08-H1", DEFAULT_PAYROLL_CONFIG, [], [], [], 0, 0, "2026-08-15");
    expect(p.periodDays).toBe(15);
    expect(p.employedDays).toBe(14);
    expect(p.periodSalary).toBeCloseTo(15000 * (14 / 15), 5);
  });

  it("pays zero half salary for a period entirely before the employee was hired", () => {
    const notYetHired: PayrollEmployee = { ...emp, hireDate: "2026-09-01" };
    const p = computePayroll(notYetHired, "2026-08-H2", DEFAULT_PAYROLL_CONFIG, [], [], [], 0, 0, "2026-08-31");
    expect(p.employedDays).toBe(0);
    expect(p.periodSalary).toBe(0);
  });

  it("pays the full flat half salary when hireDate is on or before the period start (unchanged behavior)", () => {
    const hiredOnPeriodStart: PayrollEmployee = { ...emp, hireDate: "2026-08-01" };
    const p = computePayroll(hiredOnPeriodStart, "2026-08-H1", DEFAULT_PAYROLL_CONFIG, [], [], [], 0, 0, "2026-08-15");
    expect(p.employedDays).toBe(p.periodDays);
    expect(p.periodSalary).toBe(15000);
  });

  it("subtracts advances and adds commission into the net total", () => {
    const p = computePayroll(emp, "2026-08-H2", DEFAULT_PAYROLL_CONFIG, [], [], [], 200, 300, "2026-08-31");
    // 15000 - 0 - 0 - 0(SS) - 200 + 300
    expect(p.net).toBeCloseTo(15000 - 200 + 300, 5);
  });
});

describe("computePayroll — social security deduction", () => {
  const emp: PayrollEmployee = {
    id: "e1",
    baseSalary: 30000,
    workStart: "09:00",
    workEnd: "18:00",
    daysOff: [0],
    hireDate: "2020-01-01",
    socialSecurityRate: 5, // 5%
  };

  it("deducts a percentage of the period's gross pay", () => {
    const p = computePayroll(emp, "2026-08-H1", DEFAULT_PAYROLL_CONFIG, [], [], [], 0, 0, "2026-08-15");
    // periodSalary 15000 * 5% = 750
    expect(p.socialSecurityDeduction).toBe(750);
    expect(p.net).toBe(15000 - 750);
  });

  it("defaults to 0 when the employee has no rate set", () => {
    const noRate: PayrollEmployee = { ...emp, socialSecurityRate: undefined };
    const p = computePayroll(noRate, "2026-08-H1", DEFAULT_PAYROLL_CONFIG, [], [], [], 0, 0, "2026-08-15");
    expect(p.socialSecurityDeduction).toBe(0);
  });

  it("scales down proportionally for a pro-rated mid-period hire", () => {
    const midHire: PayrollEmployee = { ...emp, hireDate: "2026-08-02" };
    const p = computePayroll(midHire, "2026-08-H1", DEFAULT_PAYROLL_CONFIG, [], [], [], 0, 0, "2026-08-15");
    // periodSalary = 15000 * 14/15 = 14000, SS = 5% of that = 700
    expect(p.socialSecurityDeduction).toBeCloseTo(700, 5);
  });
});

describe("computePayroll — MONTHLY frequency", () => {
  const config: PayrollConfig = { ...DEFAULT_PAYROLL_CONFIG, frequency: "MONTHLY", monthlyPayDay: 1 };
  const emp: PayrollEmployee = {
    id: "e1",
    baseSalary: 30000,
    workStart: "09:00",
    workEnd: "18:00",
    daysOff: [0],
    hireDate: "2020-01-01",
  };

  it("pays the full flat monthly salary with no deductions", () => {
    const p = computePayroll(emp, "2026-08", config, [], [], [], 0, 0, "2026-08-31");
    expect(p.periodSalary).toBe(30000);
    expect(p.isCommissionPeriod).toBe(true); // the only period in the month always covers month-end
    expect(p.net).toBe(30000);
  });

  it("pro-rates for a mid-month hire", () => {
    const midHire: PayrollEmployee = { ...emp, hireDate: "2026-08-16" }; // 16 of 31 days employed
    const p = computePayroll(midHire, "2026-08", config, [], [], [], 0, 0, "2026-08-31");
    expect(p.periodDays).toBe(31);
    expect(p.employedDays).toBe(16);
    expect(p.periodSalary).toBeCloseTo(30000 * (16 / 31), 5);
  });
});

describe("computePayroll — WEEKLY frequency", () => {
  const config: PayrollConfig = { ...DEFAULT_PAYROLL_CONFIG, frequency: "WEEKLY", weeklyPayWeekday: 5 };
  const emp: PayrollEmployee = {
    id: "e1",
    baseSalary: 30000, // dailyRate = 1000, so a full 7-day week = 7000
    workStart: "09:00",
    workEnd: "18:00",
    daysOff: [0],
    hireDate: "2020-01-01",
  };

  it("pays 7x the daily rate for a full week", () => {
    const p = computePayroll(emp, "2026-08-14", config, [], [], [], 0, 0, "2026-08-14");
    expect(p.periodDays).toBe(7);
    expect(p.periodSalary).toBe(7000);
  });
});

describe("computePayroll — DAILY_WAGE wage type", () => {
  const emp: PayrollEmployee = {
    id: "e1",
    baseSalary: 30000, // dailyRate = 1000
    workStart: "09:00",
    workEnd: "18:00",
    daysOff: [0],
    hireDate: "2020-01-01",
    wageType: "DAILY_WAGE",
  };

  it("pays the daily rate only for days actually checked in — no work, no pay", () => {
    const attendance: AttendanceRecord[] = [
      { employeeId: "e1", date: "2026-08-03", checkInTime: "09:00", lateMinutes: 0, deductionAmount: 0 },
      { employeeId: "e1", date: "2026-08-05", checkInTime: "09:30", lateMinutes: 30, deductionAmount: 111.11 },
      // no checkInTime — a record can exist (e.g. an aborted check-in flow) without counting as worked
      { employeeId: "e1", date: "2026-08-07", checkInTime: null, lateMinutes: 0, deductionAmount: 0 },
    ];
    const p = computePayroll(emp, "2026-08-H1", DEFAULT_PAYROLL_CONFIG, attendance, [], [], 0, 0, "2026-08-15");
    expect(p.daysWorkedInPeriod).toBe(2);
    expect(p.periodSalary).toBe(2000); // 2 days x 1000/day
  });

  it("never applies a late or leave deduction, even with late check-ins or approved leave", () => {
    const attendance: AttendanceRecord[] = [
      { employeeId: "e1", date: "2026-08-03", checkInTime: "09:30", lateMinutes: 30, deductionAmount: 111.11 },
    ];
    const leaves: LeaveRecord[] = [{ employeeId: "e1", date: "2026-08-04", type: "SICK", status: "APPROVED" }];
    const p = computePayroll(emp, "2026-08-H1", DEFAULT_PAYROLL_CONFIG, attendance, [], leaves, 0, 0, "2026-08-15");
    expect(p.lateCount).toBe(1); // still reported for visibility...
    expect(p.lateDeduction).toBe(0); // ...but never deducted
    expect(p.leaveCount).toBe(1);
    expect(p.leaveDeduction).toBe(0);
    expect(p.net).toBe(1000); // just the one day worked, nothing subtracted
  });

  it("still applies social security as a % of the (attendance-based) period salary", () => {
    const dailyWageWithSS: PayrollEmployee = { ...emp, socialSecurityRate: 5 };
    const attendance: AttendanceRecord[] = [
      { employeeId: "e1", date: "2026-08-03", checkInTime: "09:00", lateMinutes: 0, deductionAmount: 0 },
    ];
    const p = computePayroll(dailyWageWithSS, "2026-08-H1", DEFAULT_PAYROLL_CONFIG, attendance, [], [], 0, 0, "2026-08-15");
    // periodSalary 1000 * 5% = 50
    expect(p.socialSecurityDeduction).toBe(50);
    expect(p.net).toBe(950);
  });

  it("defaults to MONTHLY (the old flat-salary behavior) when wageType is omitted", () => {
    const noWageType: PayrollEmployee = { ...emp, wageType: undefined };
    const p = computePayroll(noWageType, "2026-08-H1", DEFAULT_PAYROLL_CONFIG, [], [], [], 0, 0, "2026-08-15");
    expect(p.wageType).toBe("MONTHLY");
    expect(p.periodSalary).toBe(15000); // half of 30000, same as any other MONTHLY employee
  });
});
