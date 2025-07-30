import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, className }) => {
  const [hours, setHours] = useState<number>(12);
  const [minutes, setMinutes] = useState<number>(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');

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

  const hourAngles = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteAngles = Array.from({ length: 12 }, (_, i) => i * 5);

  const getHourAngle = (hour: number) => (hour % 12) * 30 - 90;
  const getMinuteAngle = (minute: number) => (minute / 5) * 30 - 90;

  const handleHourClick = (hour: number) => {
    setHours(hour);
  };

  const handleMinuteClick = (minute: number) => {
    setMinutes(minute);
  };

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      {/* Clock Face */}
      <div className="relative w-48 h-48 bg-muted rounded-full border-2 border-border">
        {/* Hour markers */}
        {hourAngles.map((hour) => (
          <button
            key={`hour-${hour}`}
            className={cn(
              "absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
              hours === hour ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"
            )}
            style={{
              top: `${50 + 35 * Math.sin((getHourAngle(hour) + 90) * Math.PI / 180) - 16}px`,
              left: `${50 + 35 * Math.cos((getHourAngle(hour) + 90) * Math.PI / 180) - 16}px`,
            }}
            onClick={() => handleHourClick(hour)}
          >
            {hour}
          </button>
        ))}

        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>

        {/* Hour hand */}
        <div
          className="absolute top-1/2 left-1/2 w-0.5 bg-primary origin-bottom"
          style={{
            height: '30px',
            transform: `translate(-50%, -100%) rotate(${getHourAngle(hours)}deg)`,
          }}
        ></div>

        {/* Minute hand */}
        <div
          className="absolute top-1/2 left-1/2 w-0.5 bg-secondary origin-bottom"
          style={{
            height: '40px',
            transform: `translate(-50%, -100%) rotate(${getMinuteAngle(minutes)}deg)`,
          }}
        ></div>
      </div>

      {/* Minute selection */}
      <div className="grid grid-cols-6 gap-2 w-full max-w-xs">
        {minuteAngles.map((minute) => (
          <button
            key={`minute-${minute}`}
            className={cn(
              "px-2 py-1 rounded text-sm font-bold transition-all",
              minutes === minute 
                ? "bg-secondary text-secondary-foreground" 
                : "hover:bg-accent hover:text-accent-foreground"
            )}
            onClick={() => handleMinuteClick(minute)}
          >
            {minute.toString().padStart(2, '0')}
          </button>
        ))}
      </div>

      {/* AM/PM Toggle */}
      <div className="flex space-x-2">
        <button
          className={cn(
            "px-4 py-2 rounded-lg font-bold transition-all",
            period === 'AM' 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted hover:bg-accent"
          )}
          onClick={() => setPeriod('AM')}
        >
          AM
        </button>
        <button
          className={cn(
            "px-4 py-2 rounded-lg font-bold transition-all",
            period === 'PM' 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted hover:bg-accent"
          )}
          onClick={() => setPeriod('PM')}
        >
          PM
        </button>
      </div>

      {/* Digital Display */}
      <div className="text-center">
        <div className="text-2xl font-bold font-mono">
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')} {period}
        </div>
      </div>
    </div>
  );
};