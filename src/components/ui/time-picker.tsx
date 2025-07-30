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
    return (hour % 12) * 30;
  };

  const handleHourClick = (hour: number) => {
    setHours(hour);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Curved Tab Container */}
      <div className="bg-white rounded-3xl shadow-xl p-8 relative overflow-hidden">
        {/* Curved tab effect */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-16 h-8 bg-white rounded-b-2xl shadow-lg"></div>
        
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">SELECT TIME</h3>
          
          {/* Digital Display */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="bg-purple-100 rounded-2xl px-6 py-4 min-w-[100px]">
              <span className="text-4xl font-bold text-purple-600">
                {hours.toString().padStart(2, '0')}
              </span>
            </div>
            <span className="text-4xl font-bold text-gray-400">:</span>
            <div className="bg-gray-100 rounded-2xl px-6 py-4 min-w-[100px]">
              <span className="text-4xl font-bold text-gray-600">
                {minutes.toString().padStart(2, '0')}
              </span>
            </div>
            
            {/* AM/PM Toggle */}
            <div className="ml-6 flex flex-col gap-2">
              <button
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  period === 'AM' 
                    ? "bg-purple-200 text-purple-700 shadow-md" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                )}
                onClick={() => setPeriod('AM')}
              >
                AM
              </button>
              <button
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  period === 'PM' 
                    ? "bg-purple-200 text-purple-700 shadow-md" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                )}
                onClick={() => setPeriod('PM')}
              >
                PM
              </button>
            </div>
          </div>
        </div>

        {/* Clock Face */}
        <div className="relative w-72 h-72 bg-gray-50 rounded-full mx-auto mb-8 border border-gray-200">
          {/* Hour markers - Arranged like a real clock */}
          {hourNumbers.map((hour, index) => {
            const angle = getHourAngle(hour);
            const radius = 120; // Distance from center
            const radian = (angle - 90) * (Math.PI / 180);
            const x = Math.cos(radian) * radius;
            const y = Math.sin(radian) * radius;
            
            return (
              <button
                key={`hour-${hour}`}
                className={cn(
                  "absolute w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-200 border-2",
                  hours === hour 
                    ? "bg-purple-600 text-white border-purple-600 shadow-lg transform scale-110" 
                    : "text-gray-700 border-transparent hover:bg-purple-50 hover:border-purple-200"
                )}
                style={{
                  top: `${144 + y - 24}px`,
                  left: `${144 + x - 24}px`,
                }}
                onClick={() => handleHourClick(hour)}
              >
                {hour}
              </button>
            );
          })}

          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-purple-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10"></div>

          {/* Hour hand */}
          <div
            className="absolute top-1/2 left-1/2 w-1 bg-purple-600 origin-bottom rounded-full z-10"
            style={{
              height: '90px',
              transform: `translate(-50%, -100%) rotate(${getHourAngle(hours)}deg)`,
            }}
          ></div>

          {/* Hand circle at the end */}
          <div
            className="absolute w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg z-20"
            style={{
              top: `${144 + Math.sin((getHourAngle(hours) - 90) * Math.PI / 180) * 90 - 20}px`,
              left: `${144 + Math.cos((getHourAngle(hours) - 90) * Math.PI / 180) * 90 - 20}px`,
            }}
          >
            {hours}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-100">
          <div className="flex-1">
            {/* Keyboard icon placeholder */}
            <button className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          
          <div className="flex gap-6">
            <Button 
              variant="ghost" 
              className="text-purple-600 font-bold text-lg px-6 py-3 rounded-xl hover:bg-purple-50"
              onClick={onCancel}
            >
              CANCEL
            </Button>
            <Button 
              variant="ghost" 
              className="text-purple-600 font-bold text-lg px-6 py-3 rounded-xl hover:bg-purple-50"
              onClick={onConfirm}
            >
              OK
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};