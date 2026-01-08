"""
Solar Panel Degradation Calculation API Endpoint
Calculates and visualizes solar panel degradation over time
"""

import io
import base64
import logging
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

# Create logger
logger = logging.getLogger(__name__)

router = APIRouter()

class SolarDegradationRequest(BaseModel):
    installed_power: float
    panel_age: int

class SolarDegradationResponse(BaseModel):
    plot_image: str

@router.post("/solar-panel-degradation", response_model=SolarDegradationResponse)
async def calculate_solar_panel_degradation(request: SolarDegradationRequest):
    """
    Calculate solar panel degradation over time and generate visualization plot.
    
    Parameters:
    - installed_power: Initial installed power in Watts
    - panel_age: Current age of the panels in years
    
    Returns:
    - plot_image: Base64 encoded PNG image of the degradation plot
    """
    try:
        data = request.dict()
        
        # Parameters
        installed_power = float(data.get('installed_power'))
        panel_age = data.get('panel_age')
        end_of_life = 30  # Typical end of life for solar panels in years

        # Degradation rates
        initial_degradation_rate = 2  # Annual degradation rate for the first year in percentage
        subsequent_degradation_rate = 0.6  # Annual degradation rate from the second year onwards in percentage

        # Ensure that the panel_age does not exceed end_of_life
        if panel_age > end_of_life:
            raise HTTPException(
                status_code=400,
                detail="Error: The current age of the panels cannot exceed their end of life."
            )
        
        # Calculate power degradation at 5-year intervals plus the current age
        years = sorted(list(set([0] + list(range(5, end_of_life + 1, 5)) + [panel_age])))
        power = []

        for year in years:
            if year == 0:
                # Installed power at year 0
                power.append(installed_power)
            elif year == 1:
                # Degraded power after the first year with 2% degradation
                power.append(installed_power * (1 - initial_degradation_rate / 100))
            else:
                # Degradation from the second year onwards with 0.6% per year
                total_degradation = initial_degradation_rate + (year - 1) * subsequent_degradation_rate
                power.append(installed_power * (1 - total_degradation / 100))

        # Plotting the results
        x = np.arange(len(years))  # the label locations
        width = 0.6  # Increase the width of the bars

        fig, ax1 = plt.subplots(figsize=(12, 6))

        # Define colors for bars
        colors = ['purple' if year == panel_age else 'lightblue' for year in years]
        
        # Set font properties to Times New Roman
        plt.rcParams['font.family'] = 'serif'
        plt.rcParams['font.serif'] = ['Times New Roman']

        # Plot power output at each interval
        bars = ax1.bar(x, power, width, color=colors, label='Power Output')
        ax1.set_xlabel('Years')
        ax1.set_ylabel('Power Output (W)')
        ax1.set_title('Solar Power Degradation Over Time')
        ax1.set_xticks(x)
        ax1.set_xticklabels(years)
        
        # Remove the grid from the plot
        ax1.grid(False)

        # Add values on top of the bars
        for bar in bars:
            height = bar.get_height()
            ax1.annotate(f'{height:.1f}',
                         xy=(bar.get_x() + bar.get_width() / 2, height),
                         xytext=(0, 3),  # 3 points vertical offset
                         textcoords="offset points",
                         ha='center', va='bottom')

        # Save plot to a bytes buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        buf.close()

        # Clear the figure
        plt.close(fig)

        # Return the image as a response
        return SolarDegradationResponse(plot_image=image_base64)
        
    except Exception as e:
        logger.error(f"Error calculating solar panel degradation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

