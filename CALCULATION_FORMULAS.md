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

**Solar Capacity (kW)**
```
Solar Capacity = Daily Consumption / (Peak Sun Hours × System Efficiency)

Where:
- Peak Sun Hours = 5 hours/day
- System Efficiency = 0.773 (77.3%)
```

**Daily Solar Generation (kWh)**
```
Daily Solar Generation = Solar Capacity × Peak Sun Hours × System Efficiency
```

---

### 1.3 Battery Capacity Sizing

**Battery Capacity (kWh)**
```
Battery Capacity = Daily Consumption × Battery-to-Daily Ratio

Where Battery-to-Daily Ratio:
- Residential: 0.83 (83%)
- Commercial: 0.65 (65%)
- Industrial: 0.55 (55%)
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
Electrolyzer Capacity = Solar Capacity × 0.2 (20% of solar)
```

**Fuel Cell Capacity (kW)**
```
Fuel Cell Capacity = Peak Power × 0.5 (50% of peak)
```

**H2 Tank Capacity (kg)**
```
H2 Tank Capacity = Battery Capacity (kWh) / 33.3

Where: 1 kg H2 ≈ 33.3 kWh
```

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

## 4. EXAMPLE CALCULATION

**Input:**
- Daily Consumption: 9.90 kWh/day
- Use Case: Residential

**Step 1: Technical Sizing**
```
Average Power = 9.90 / 24 = 0.4125 kW
Peak Power = 0.4125 × 2.5 = 1.03125 kW
Solar Capacity = 9.90 / (5 × 0.773) = 2.56 kW
Battery Capacity = 9.90 × 0.83 = 8.217 kWh ≈ 8.21 kWh
Inverter Capacity = 2.56 × 1.25 = 3.2 kW ≈ 3.19 kW
DC-DC Converter = 2.56 × 1.25 = 3.2 kW ≈ 3.19 kW
```

**Step 2: Economic Analysis**
```
Solar Cost = 2.56 × ₹40,000 = ₹102,400
Battery Cost = 8.21 × ₹8,000 = ₹65,680
Inverter Cost = 3.19 × ₹8,000 = ₹25,520
DC-DC Converter Cost = 3.19 × ₹1,500 = ₹4,785
Installation = (102,400 + 65,680 + 25,520 + 4,785) × 0.10 = ₹19,838.50
Total CAPEX = ₹217,223.50
```

**Step 3: Annual Generation**
```
Annual Consumption = 9.90 × 365 = 3,613.5 kWh
Dual Mode Annual Generation = 2.56 × 5 × 365 × 0.80 = 3,737.6 kWh
On-Grid Annual Generation = 2.56 × 5 × 365 × 0.85 = 3,972.8 kWh
```

**Step 4: Carbon Emissions**
```
Pure Grid Annual Emissions = 3,613.5 × 0.82 = 2,963.07 kg CO₂
Dual Mode Operational Annual = (Solar Operational + Grid Emissions) / 25
Carbon Offset % = (Reduction / 2,963.07) × 100
```

---

## 5. NOTES

1. **System Efficiency (77.3%)**: This accounts for inverter losses, DC-DC converter losses, and battery round-trip efficiency in the solar sizing calculation.

2. **Battery Sizing**: The battery-to-daily ratio is conservative to account for depth of discharge (DoD) limitations and efficiency losses.

3. **Carbon Offset**: Uses operational emissions only (excludes manufacturing) to match the old website's calculation methodology.

4. **Payback Period**: Calculated as simple payback (CAPEX / Annual Savings), not discounted payback.

5. **Grid Tariffs**: These are default values and can be adjusted based on location and utility rates.

---

**Last Updated:** Based on `backend/routes/planning.js` implementation

