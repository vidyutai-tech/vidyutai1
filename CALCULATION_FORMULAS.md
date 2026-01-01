# Planning Wizard - Calculation Formulas

This document contains all the formulas used in the Planning Wizard for technical sizing, economic analysis, and emissions calculations.

---

## Technical Recommended Rating FORMULAS

### 1.1 Basic Power Calculations

**Average Power (kW)**
```
Average Power = Daily Consumption (kWh) / 24 hours
```

**Peak Power (kW)**
```
Peak Power = Average Power × Peak-to-Average Ratio

Where Peak-to-Average Ratio:
- Residential: 2.5
- Commercial: 1.8
- Industrial: 1.3
```

**Annual Consumption (kWh)**
```
Annual Consumption = Daily Consumption × 365 days
```

---

### 1.2 Solar Capacity Sizing

**Base Solar Capacity (kW)**
```
Base Solar Capacity = Daily Consumption / (Peak Sun Hours × System Efficiency)

Where:
- Peak Sun Hours = 5 hours/day
- System Efficiency = 0.773 (77.3%)
```

**Primary Goal Multipliers (Applied to Base Solar Capacity):**
```
Solar Capacity = Base Solar Capacity × Solar Multiplier

Where Solar Multiplier:
- Cost Savings: 0.9 (10% reduction to minimize initial investment)
- Self-Sustainability: 1.3 (30% increase to maximize renewable energy)
- Reliability: 1.1 (10% increase for consistent power generation)
- Carbon Reduction: 1.2 (20% increase to minimize grid emissions)
- Default (if no goal specified): 1.0
```

**Daily Solar Generation (kWh)**
```
Daily Solar Generation = Solar Capacity × Peak Sun Hours × System Efficiency
```

---

### 1.3 Battery Capacity Sizing

**Base Battery Capacity (kWh)**
```
Base Battery Capacity = Daily Consumption × Base Battery-to-Daily Ratio

Where Base Battery-to-Daily Ratio:
- Residential: 0.83 (83%)
- Commercial: 0.65 (65%)
- Industrial: 0.55 (55%)
```

**Primary Goal Multipliers (Applied to Base Battery Capacity):**
```
Battery Capacity = Base Battery Capacity × Battery Multiplier

Where Battery Multiplier:
- Cost Savings: 0.8 (20% reduction to minimize initial investment)
- Self-Sustainability: 1.3 (30% increase to maximize renewable energy storage)
- Reliability: 1.5 (50% increase for extended backup duration)
- Carbon Reduction: 1.2 (20% increase to reduce grid dependence)
- Default (if no goal specified): 1.0
```

**Battery Capacity (Ah)**
```
Battery Capacity (Ah) = (Battery Capacity (kWh) × 1000) / Battery Voltage (V)

Where Battery Voltage:
- Residential: 12V
- Commercial: 48V
- Industrial: 480V
```

**Backup Hours**
```
Backup Hours = Battery Capacity (kWh) / Average Power (kW)
```

---

### 1.4 Inverter & DC-DC Converter Sizing

**Inverter Capacity (kW/kVA)**
```
Inverter Capacity = Solar Capacity × 1.25
```

**DC-DC Converter Rating (kW)**
```
DC-DC Converter Rating = Solar Capacity × 1.25
```

---

### 1.5 Grid & Diesel Sizing

**Grid Connection (kW)**
```
Grid Connection = Peak Power (kW)
```

**Diesel Capacity (kW)**
```
Diesel Capacity = Peak Power × 1.1
```

---

### 1.6 Hydrogen System (Optional)

**Electrolyzer Capacity (kW)**
```
Electrolyzer Capacity = Solar Capacity × 0.2 (20% of solar capacity)

Purpose: Converts excess solar energy to hydrogen for long-duration storage
```

**Fuel Cell Capacity (kW)**
```
Fuel Cell Capacity = Peak Power × 0.5 (50% of peak power)

Purpose: Provides backup power generation from stored hydrogen
Note: This rating is displayed in Technical Analysis when hydrogen is enabled
```

**H2 Tank Capacity (kg)**
```
H2 Tank Capacity = Battery Capacity (kWh) / 33.3

Where: 1 kg H2 ≈ 33.3 kWh (energy equivalent)
Purpose: Stores hydrogen for fuel cell operation during extended outages
```

**Hydrogen System Cost Calculation:**
```
Electrolyzer Cost = Electrolyzer Capacity × ₹50,000
Fuel Cell Cost = Fuel Cell Capacity × ₹60,000
H2 Tank Cost = H2 Tank Capacity × ₹5,000
Total Hydrogen CAPEX = Electrolyzer Cost + Fuel Cell Cost + H2 Tank Cost
```

**Display in Technical Analysis:**
When hydrogen system is enabled, the following fields are shown:
- Fuel Cell Rating (kW): `Fuel Cell Capacity`
- Electrolyzer Rating (kW): `Electrolyzer Capacity`
- H2 Tank Capacity (kg): `H2 Tank Capacity`

---

## 2. ECONOMIC ANALYSIS FORMULAS

### 2.1 Cost Assumptions

**Unit Costs:**
- Solar Cost: ₹40,000 per kW
- Battery Cost: ₹8,000 per kWh
- Inverter Cost: ₹8,000 per kW
- DC-DC Converter Cost: ₹1,500 per kW
- Installation: 10% of equipment cost
- O&M: 3% of (Solar + Battery) cost per year

**Hydrogen System Costs (if applicable):**
- Electrolyzer: ₹50,000 per kW
- Fuel Cell: ₹60,000 per kW
- H2 Tank: ₹5,000 per kg

---

### 2.2 Dual Mode System Costs

**Equipment Costs:**
```
Solar Cost = Solar Capacity × ₹40,000
Battery Cost = Battery Capacity × ₹8,000
Inverter Cost = Inverter Capacity × ₹8,000
DC-DC Converter Cost = DC-DC Converter Rating × ₹1,500
```

**Installation Cost:**
```
Installation Cost = (Solar + Battery + Inverter + DC-DC Converter) × 0.10
```

**Total CAPEX:**
```
Total CAPEX = Equipment Cost + Installation Cost
```

**Annual O&M Cost:**
```
Annual O&M = (Solar Cost + Battery Cost) × 0.03
Monthly O&M = Annual O&M / 12
```

---

### 2.3 On-Grid System Costs

**Equipment Costs:**
```
Solar Cost = Solar Capacity × ₹40,000
Inverter Cost = Inverter Capacity × ₹8,000
Battery Cost = 0 (No battery)
DC-DC Converter Cost = 0 (No DC-DC converter)
```

**Installation Cost:**
```
Installation Cost = (Solar + Inverter) × 0.10
```

**Total CAPEX:**
```
Total CAPEX = Equipment Cost + Installation Cost
```

**Annual O&M Cost:**
```
Annual O&M = Solar Cost × 0.03
Monthly O&M = Annual O&M / 12
```

---

### 2.4 Annual Generation & Revenue

**System Efficiencies:**
- Dual Mode System Efficiency: 0.80 (80%) - lower due to battery round-trip losses
- On-Grid System Efficiency: 0.85 (85%) - higher, direct grid connection

**Annual Solar Generation:**
```
Dual Mode: Annual Generation = Solar Capacity × 5 × 365 × 0.80
On-Grid: Annual Generation = Solar Capacity × 5 × 365 × 0.85
```

**Grid Tariffs:**
- Grid Export Tariff: ₹8.0 per kWh (selling excess solar)
- Grid Purchase Tariff: ₹8.5 per kWh (buying from grid)

**Annual Revenue:**
```
Dual Mode Revenue = Annual Generation (Dual Mode) × ₹8.0
On-Grid Revenue = Annual Generation (On-Grid) × ₹8.0
```

**Grid Energy Needed:**
```
Dual Mode Grid Energy = max(0, Annual Consumption - Annual Generation (Dual Mode))
On-Grid Grid Energy = max(0, Annual Consumption - Annual Generation (On-Grid))
```

**Annual Grid Cost:**
```
Dual Mode Grid Cost = Dual Mode Grid Energy × ₹8.5
On-Grid Grid Cost = On-Grid Grid Energy × ₹8.5
```

---

### 2.5 Annual Savings & Payback Period

**Annual Savings:**
```
Dual Mode Savings = Annual Revenue - Annual Grid Cost - Annual O&M
On-Grid Savings = Annual Revenue - Annual Grid Cost - Annual O&M
```

**Monthly Savings:**
```
Monthly Savings = Annual Savings / 12
```

**Payback Period (years):**
```
Payback Period = Total CAPEX / Annual Savings

(If Annual Savings ≤ 0, Payback Period = 0)
```

---

## 3. CARBON EMISSIONS CALCULATION FORMULAS

### 3.1 Emission Factors

**Emission Factors:**
- Grid Emission Factor: 0.82 kg CO₂ per kWh (Indian grid average)
- Solar Operational Factor: 0.05 kg CO₂ per kWh (operational emissions)
- Solar Manufacturing Factor: 0.04 kg CO₂ per kWh capacity (manufacturing)
- Battery Manufacturing Factor: 150 kg CO₂ per kWh capacity (manufacturing)
- System Lifetime: 25 years

---

### 3.2 Lifetime Emissions Calculation

**Lifetime Consumption:**
```
Lifetime Consumption = Annual Consumption × 25 years
```

**Dual Mode System - Lifetime Emissions (25 years):**

1. **Solar Manufacturing Emissions (one-time):**
```
Solar Manufacturing = Solar Capacity (kW) × 0.04 × 1000
```

2. **Solar Operational Emissions:**
```
Solar Operational = Annual Solar Generation (Dual Mode) × 0.05 × 25 years
```

3. **Grid Emissions:**
```
Grid Emissions = Dual Mode Grid Energy Needed × 0.82 × 25 years
```

4. **Battery Manufacturing Emissions (one-time):**
```
Battery Manufacturing = Battery Capacity (kWh) × 150
```

5. **Total Dual Mode Lifetime Emissions:**
```
Total Emissions (kg) = Solar Manufacturing + Solar Operational + Grid Emissions + Battery Manufacturing
Total Emissions (tonnes) = Total Emissions (kg) / 1000
```

**On-Grid System - Lifetime Emissions (25 years):**

1. **Solar Manufacturing Emissions (one-time):**
```
Solar Manufacturing = Solar Capacity (kW) × 0.04 × 1000
```

2. **Solar Operational Emissions:**
```
Solar Operational = Annual Solar Generation (On-Grid) × 0.05 × 25 years
```

3. **Grid Emissions:**
```
Grid Emissions = On-Grid Grid Energy Needed × 0.82 × 25 years
```

4. **Total On-Grid Lifetime Emissions:**
```
Total Emissions (kg) = Solar Manufacturing + Solar Operational + Grid Emissions
Total Emissions (tonnes) = Total Emissions (kg) / 1000
```

---

### 3.3 Annual Emissions (for display)

**Annual Emissions:**
```
Dual Mode Annual Emissions = Dual Mode Lifetime Emissions / 25
On-Grid Annual Emissions = On-Grid Lifetime Emissions / 25
```

---

### 3.4 Carbon Offset Calculation

**Pure Grid Baseline:**
```
Pure Grid Annual Emissions = Annual Consumption × 0.82
Pure Grid Lifetime Emissions = Lifetime Consumption × 0.82
```

**Dual Mode Operational Emissions (Annual):**
```
Dual Mode Operational Annual = (Solar Operational + Grid Emissions) / 25 years

Note: Excludes manufacturing emissions for carbon offset calculation
```

**Annual CO₂ Reduction:**
```
Annual CO₂ Reduction = Pure Grid Annual Emissions - Dual Mode Operational Annual Emissions
```

**Carbon Offset Percentage:**
```
Carbon Offset % = (Annual CO₂ Reduction / Pure Grid Annual Emissions) × 100
```

**Lifetime CO₂ Reduction:**
```
Lifetime CO₂ Reduction (tonnes) = (Pure Grid Lifetime Emissions - Dual Mode Lifetime Emissions) / 1000
```

---

## 4. PRIMARY GOAL OPTIMIZATION STRATEGY

The system adjusts solar and battery sizing based on the selected primary goal to optimize for different objectives:

### 4.1 Cost Savings Optimization
**Strategy:** Minimize initial investment while maintaining basic functionality
- Solar: 10% reduction (multiplier: 0.9)
- Battery: 20% reduction (multiplier: 0.8)
- **Result:** Lower CAPEX, faster payback, but reduced self-sufficiency

### 4.2 Self-Sustainability Optimization
**Strategy:** Maximize renewable energy usage and independence from grid
- Solar: 30% increase (multiplier: 1.3)
- Battery: 30% increase (multiplier: 1.3)
- **Result:** Higher renewable energy generation, better energy independence, longer backup duration

### 4.3 Reliability Optimization
**Strategy:** Ensure continuous power supply with extended backup duration
- Solar: 10% increase (multiplier: 1.1)
- Battery: 50% increase (multiplier: 1.5)
- **Result:** Extended backup hours, better resilience during outages, higher reliability

### 4.4 Carbon Reduction Optimization
**Strategy:** Minimize grid emissions through increased renewable energy
- Solar: 20% increase (multiplier: 1.2)
- Battery: 20% increase (multiplier: 1.2)
- **Result:** Lower carbon footprint, reduced grid dependence, balanced cost-performance

---

## 5. EXAMPLE CALCULATIONS

### Example 1: Base Calculation (No Primary Goal)

**Input:**
- Daily Consumption: 9.90 kWh/day
- Use Case: Residential
- Primary Goal: None (default)

**Step 1: Technical Sizing**
```
Average Power = 9.90 / 24 = 0.4125 kW
Peak Power = 0.4125 × 2.5 = 1.03125 kW
Base Solar Capacity = 9.90 / (5 × 0.773) = 2.56 kW
Solar Capacity = 2.56 × 1.0 = 2.56 kW (no multiplier)
Base Battery Capacity = 9.90 × 0.83 = 8.217 kWh
Battery Capacity = 8.217 × 1.0 = 8.21 kWh (no multiplier)
Inverter Capacity = 2.56 × 1.25 = 3.2 kW ≈ 3.19 kW
DC-DC Converter = 2.56 × 1.25 = 3.2 kW ≈ 3.19 kW
```

### Example 2: Cost Savings Goal

**Input:**
- Daily Consumption: 9.90 kWh/day
- Use Case: Residential
- Primary Goal: Cost Savings

**Step 1: Technical Sizing**
```
Average Power = 9.90 / 24 = 0.4125 kW
Peak Power = 0.4125 × 2.5 = 1.03125 kW
Base Solar Capacity = 9.90 / (5 × 0.773) = 2.56 kW
Solar Capacity = 2.56 × 0.9 = 2.304 kW (10% reduction)
Base Battery Capacity = 9.90 × 0.83 = 8.217 kWh
Battery Capacity = 8.217 × 0.8 = 6.574 kWh ≈ 6.57 kWh (20% reduction)
Inverter Capacity = 2.304 × 1.25 = 2.88 kW
DC-DC Converter = 2.304 × 1.25 = 2.88 kW
```

### Example 3: Reliability Goal

**Input:**
- Daily Consumption: 9.90 kWh/day
- Use Case: Residential
- Primary Goal: Reliability

**Step 1: Technical Sizing**
```
Average Power = 9.90 / 24 = 0.4125 kW
Peak Power = 0.4125 × 2.5 = 1.03125 kW
Base Solar Capacity = 9.90 / (5 × 0.773) = 2.56 kW
Solar Capacity = 2.56 × 1.1 = 2.816 kW (10% increase)
Base Battery Capacity = 9.90 × 0.83 = 8.217 kWh
Battery Capacity = 8.217 × 1.5 = 12.326 kWh ≈ 12.33 kWh (50% increase)
Backup Hours = 12.33 / 0.4125 = 29.9 hours (extended backup)
Inverter Capacity = 2.816 × 1.25 = 3.52 kW
DC-DC Converter = 2.816 × 1.25 = 3.52 kW
```

### Example 4: With Hydrogen System

**Input:**
- Daily Consumption: 9.90 kWh/day
- Use Case: Residential
- Primary Goal: Self-Sustainability
- Include Hydrogen: Yes

**Step 1: Technical Sizing**
```
Base Solar Capacity = 9.90 / (5 × 0.773) = 2.56 kW
Solar Capacity = 2.56 × 1.3 = 3.328 kW (30% increase for self-sustainability)
Base Battery Capacity = 9.90 × 0.83 = 8.217 kWh
Battery Capacity = 8.217 × 1.3 = 10.682 kWh (30% increase)
Peak Power = 0.4125 × 2.5 = 1.03125 kW
```

**Step 2: Hydrogen System Sizing**
```
Electrolyzer Capacity = 3.328 × 0.2 = 0.666 kW
Fuel Cell Capacity = 1.03125 × 0.5 = 0.516 kW
H2 Tank Capacity = 10.682 / 33.3 = 0.321 kg
```

**Step 3: Hydrogen System Costs**
```
Electrolyzer Cost = 0.666 × ₹50,000 = ₹33,300
Fuel Cell Cost = 0.516 × ₹60,000 = ₹30,960
H2 Tank Cost = 0.321 × ₹5,000 = ₹1,605
Total Hydrogen CAPEX = ₹33,300 + ₹30,960 + ₹1,605 = ₹65,865
```

### Example 5: Economic Analysis (Cost Savings Goal)

**Input:**
- Daily Consumption: 9.90 kWh/day
- Use Case: Residential
- Primary Goal: Cost Savings
- Solar Capacity: 2.304 kW (from Example 2)
- Battery Capacity: 6.574 kWh (from Example 2)

**Step 1: Equipment Costs**
```
Solar Cost = 2.304 × ₹40,000 = ₹92,160
Battery Cost = 6.574 × ₹8,000 = ₹52,592
Inverter Cost = 2.88 × ₹8,000 = ₹23,040
DC-DC Converter Cost = 2.88 × ₹1,500 = ₹4,320
Equipment Total = ₹172,112
```

**Step 2: Installation & CAPEX**
```
Installation = ₹172,112 × 0.10 = ₹17,211.20
Total CAPEX = ₹172,112 + ₹17,211.20 = ₹189,323.20
```

**Comparison with Reliability Goal:**
- Cost Savings CAPEX: ₹189,323.20
- Reliability CAPEX (from Example 3): Higher due to larger battery
- **Savings:** Cost Savings goal reduces CAPEX by optimizing for lower initial investment

### Example 6: Annual Generation Comparison

**Input:** Daily Consumption: 9.90 kWh/day

**Cost Savings Goal:**
```
Solar Capacity = 2.304 kW
Annual Generation = 2.304 × 5 × 365 × 0.80 = 3,363.84 kWh
```

**Self-Sustainability Goal:**
```
Solar Capacity = 3.328 kW (from Example 4)
Annual Generation = 3.328 × 5 × 365 × 0.80 = 4,854.88 kWh
```

**Result:** Self-Sustainability generates 44% more energy, demonstrating the optimization strategy

---

**Last Updated:** Based on `backend/routes/planning.js` implementation (Updated with Primary Goal Optimization - 2025)

