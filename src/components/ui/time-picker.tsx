import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({ 
  value, 
  onChange, 
  className,
  onConfirm,
  onCancel 
}) => {
  const [hours, setHours] = useState<number>(7);
  const [minutes, setMinutes] = useState<number>(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [timeStr] = value.split(':');
      const hour = parseInt(timeStr);
      const min = parseInt(value.split(':')[1] || '0');
      
      if (hour === 0) {
        setHours(12);
        setPeriod('AM');
      } else if (hour > 12) {
        setHours(hour - 12);
        setPeriod('PM');
      } else if (hour === 12) {
        setHours(12);
        setPeriod('PM');
      } else {
        setHours(hour);
        setPeriod('AM');
      }
      
      setMinutes(min);
    }
  }, [value]);

  // Update value when time changes
  useEffect(() => {
    let hour24 = hours;
    if (period === 'AM' && hours === 12) {
      hour24 = 0;
    } else if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    }
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(timeString);
  }, [hours, minutes, period, onChange]);

  const hourNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  const getHourAngle = (hour: number) => {
    const hourIndex = hour === 12 ? 0 : hour;
    return hourIndex * 30 - 90;
  };

  const handleHourClick = (hour: number) => {
    setHours(hour);
  };

  return (
    <div className={cn("flex flex-col items-center space-y-6 bg-white p-6 rounded-2xl shadow-lg", className)}>
      {/* Header */}
      <div className="text-center">
        <h3 className="text-sm font-medium text-gray-500 mb-4">SELECT TIME</h3>
        
        {/* Digital Display */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-purple-100 rounded-lg px-4 py-3 min-w-[80px]">
            <span className="text-3xl font-bold text-purple-600">
              {hours.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-3xl font-bold text-gray-400">:</span>
          <div className="bg-gray-100 rounded-lg px-4 py-3 min-w-[80px]">
            <span className="text-3xl font-bold text-gray-600">
              {minutes.toString().padStart(2, '0')}
            </span>
          </div>
          
          {/* AM/PM Toggle */}
          <div className="ml-4 flex flex-col gap-1">
            <button
              className={cn(
                "px-3 py-1 rounded text-sm font-medium transition-all",
                period === 'AM' 
                  ? "bg-purple-100 text-purple-600" 
                  : "text-gray-400 hover:text-gray-600"
              )}
              onClick={() => setPeriod('AM')}
            >
              AM
            </button>
            <button
              className={cn(
                "px-3 py-1 rounded text-sm font-medium transition-all",
                period === 'PM' 
                  ? "bg-purple-100 text-purple-600" 
                  : "text-gray-400 hover:text-gray-600"
              )}
              onClick={() => setPeriod('PM')}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* Clock Face */}
      <div className="relative w-64 h-64 bg-gray-100 rounded-full">
        {/* Hour markers */}
        {hourNumbers.map((hour) => {
          const angle = getHourAngle(hour);
          const radius = 100; // Distance from center
          const x = Math.cos((angle + 90) * Math.PI / 180) * radius;
          const y = Math.sin((angle + 90) * Math.PI / 180) * radius;
          
          return (
            <button
              key={`hour-${hour}`}
              className={cn(
                "absolute w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-all",
                hours === hour 
                  ? "bg-purple-600 text-white transform scale-110" 
                  : "text-gray-700 hover:bg-gray-200"
              )}
              style={{
                top: `${128 + y - 20}px`,
                left: `${128 + x - 20}px`,
              }}
              onClick={() => handleHourClick(hour)}
            >
              {hour}
            </button>
          );
        })}

        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-purple-600 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>

        {/* Hour hand */}
        <div
          className="absolute top-1/2 left-1/2 w-1 bg-purple-600 origin-bottom rounded-full"
          style={{
            height: '80px',
            transform: `translate(-50%, -100%) rotate(${getHourAngle(hours)}deg)`,
          }}
        ></div>

        {/* Hand circle */}
        <div
          className="absolute w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{
            top: `${128 + Math.sin((getHourAngle(hours) + 90) * Math.PI / 180) * 80 - 16}px`,
            left: `${128 + Math.cos((getHourAngle(hours) + 90) * Math.PI / 180) * 80 - 16}px`,
          }}
        >
          {hours}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center w-full pt-4">
        <div className="flex-1">
          {/* Keyboard icon placeholder */}
          <button className="text-gray-400 hover:text-gray-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        <div className="flex gap-4">
          <Button 
            variant="ghost" 
            className="text-purple-600 font-medium"
            onClick={onCancel}
          >
            CANCEL
          </Button>
          <Button 
            variant="ghost" 
            className="text-purple-600 font-medium"
            onClick={onConfirm}
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};