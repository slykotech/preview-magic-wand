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
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');

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
  const minuteNumbers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const getAngle = (value: number, max: number) => {
    return (value % max) * (360 / max);
  };

  const handleHourClick = (hour: number) => {
    setHours(hour);
    setMode('minutes'); // Automatically switch to minutes after selecting hour
  };

  const handleMinuteClick = (minute: number) => {
    setMinutes(minute);
  };

  const currentNumbers = mode === 'hours' ? hourNumbers : minuteNumbers;
  const currentValue = mode === 'hours' ? hours : minutes;

  return (
    <div className={cn("relative", className)}>
      {/* Curved Tab Container - Reduced size */}
      <div className="bg-white rounded-2xl shadow-lg p-4 relative overflow-hidden max-w-sm mx-auto">
        {/* Curved tab effect */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-12 h-6 bg-white rounded-b-xl shadow-md"></div>
        
        {/* Header */}
        <div className="text-center mb-4">
          <h3 className="text-xs font-medium text-gray-500 mb-3">SELECT TIME</h3>
          
          {/* Digital Display */}
          <div className="flex items-center justify-center gap-1 mb-4">
            <button
              onClick={() => setMode('hours')}
              className={cn(
                "rounded-xl px-3 py-2 min-w-[60px] transition-all",
                mode === 'hours' ? "bg-purple-100" : "bg-gray-50 hover:bg-gray-100"
              )}
            >
              <span className={cn(
                "text-2xl font-bold",
                mode === 'hours' ? "text-purple-600" : "text-gray-600"
              )}>
                {hours.toString().padStart(2, '0')}
              </span>
            </button>
            <span className="text-2xl font-bold text-gray-400">:</span>
            <button
              onClick={() => setMode('minutes')}
              className={cn(
                "rounded-xl px-3 py-2 min-w-[60px] transition-all",
                mode === 'minutes' ? "bg-purple-100" : "bg-gray-50 hover:bg-gray-100"
              )}
            >
              <span className={cn(
                "text-2xl font-bold",
                mode === 'minutes' ? "text-purple-600" : "text-gray-600"
              )}>
                {minutes.toString().padStart(2, '0')}
              </span>
            </button>
            
            {/* AM/PM Toggle */}
            <div className="ml-3 flex flex-col gap-1">
              <button
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-bold transition-all",
                  period === 'AM' 
                    ? "bg-purple-200 text-purple-700" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                )}
                onClick={() => setPeriod('AM')}
              >
                AM
              </button>
              <button
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-bold transition-all",
                  period === 'PM' 
                    ? "bg-purple-200 text-purple-700" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                )}
                onClick={() => setPeriod('PM')}
              >
                PM
              </button>
            </div>
          </div>
          
          {/* Mode indicator */}
          <p className="text-xs text-gray-500">
            Select {mode === 'hours' ? 'Hour' : 'Minutes'}
          </p>
        </div>

        {/* Clock Face - Reduced size */}
        <div className="relative w-48 h-48 bg-gray-50 rounded-full mx-auto mb-4 border border-gray-200">
          {/* Numbers arranged properly */}
          {currentNumbers.map((number, index) => {
            const angle = getAngle(index, 12);
            const radius = 70; // Reduced radius
            const radian = (angle - 90) * (Math.PI / 180);
            const x = Math.cos(radian) * radius;
            const y = Math.sin(radian) * radius;
            
            return (
              <button
                key={`${mode}-${number}`}
                className={cn(
                  "absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200",
                  currentValue === number 
                    ? "bg-purple-600 text-white shadow-lg transform scale-110" 
                    : "text-gray-700 hover:bg-purple-50"
                )}
                style={{
                  top: `${96 + y - 16}px`,
                  left: `${96 + x - 16}px`,
                }}
                onClick={() => mode === 'hours' ? handleHourClick(number) : handleMinuteClick(number)}
              >
                {mode === 'minutes' ? number.toString().padStart(2, '0') : number}
              </button>
            );
          })}

          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-purple-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10"></div>

          {/* Hand */}
          <div
            className="absolute top-1/2 left-1/2 w-0.5 bg-purple-600 origin-bottom rounded-full z-10"
            style={{
              height: '60px',
              transform: `translate(-50%, -100%) rotate(${getAngle(
                mode === 'hours' ? (hours === 12 ? 0 : hours) : minutes / 5,
                12
              )}deg)`,
            }}
          ></div>

          {/* Hand circle at the end */}
          <div
            className="absolute w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md z-20"
            style={{
              top: `${96 + Math.sin((getAngle(
                mode === 'hours' ? (hours === 12 ? 0 : hours) : minutes / 5,
                12
              ) - 90) * Math.PI / 180) * 60 - 12}px`,
              left: `${96 + Math.cos((getAngle(
                mode === 'hours' ? (hours === 12 ? 0 : hours) : minutes / 5,
                12
              ) - 90) * Math.PI / 180) * 60 - 12}px`,
            }}
          >
            {mode === 'hours' ? hours : Math.floor(minutes / 5)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div className="flex-1">
            {/* Mode toggle button */}
            <button 
              className="text-purple-600 hover:text-purple-700 p-1 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium"
              onClick={() => setMode(mode === 'hours' ? 'minutes' : 'hours')}
            >
              {mode === 'hours' ? 'Minutes' : 'Hours'}
            </button>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              className="text-purple-600 font-bold text-sm px-4 py-2 rounded-lg hover:bg-purple-50"
              onClick={onCancel}
            >
              CANCEL
            </Button>
            <Button 
              variant="ghost" 
              className="text-purple-600 font-bold text-sm px-4 py-2 rounded-lg hover:bg-purple-50"
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