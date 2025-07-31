import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Heart, 
  Edit3, 
  Check, 
  X,
  Calendar as CalendarIcon 
} from "lucide-react";
import { usePartnerConnectionV2 } from "@/hooks/usePartnerConnectionV2";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const RelationshipInfoSection = () => {
  const {
    isProcessing,
    connectionStatus,
    coupleData,
    updateRelationshipDetails
  } = usePartnerConnectionV2();

  const [isEditing, setIsEditing] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState(coupleData?.relationship_status || 'dating');
  const [anniversaryDate, setAnniversaryDate] = useState<Date | undefined>(
    coupleData?.anniversary_date ? new Date(coupleData.anniversary_date) : undefined
  );

  const handleEdit = () => {
    setRelationshipStatus(coupleData?.relationship_status || 'dating');
    setAnniversaryDate(coupleData?.anniversary_date ? new Date(coupleData.anniversary_date) : undefined);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setRelationshipStatus(coupleData?.relationship_status || 'dating');
    setAnniversaryDate(coupleData?.anniversary_date ? new Date(coupleData.anniversary_date) : undefined);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const success = await updateRelationshipDetails(relationshipStatus, anniversaryDate);
    if (success) {
      setIsEditing(false);
    }
  };

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'paired':
        return { text: 'Paired', color: 'text-green-600' };
      case 'pending':
        return { text: 'Pending', color: 'text-yellow-600' };
      case 'unpaired':
        return { text: 'Unpaired', color: 'text-gray-600' };
      default:
        return { text: 'Unknown', color: 'text-gray-600' };
    }
  };

  const statusDisplay = getConnectionStatusDisplay();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={20} />
            Relationship Info
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="text-xs"
            >
              <Edit3 size={14} className="mr-1" />
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div>
              <Label className="text-sm text-muted-foreground">Connection Status</Label>
              <p className={`text-sm font-medium mt-1 ${statusDisplay.color}`}>
                {statusDisplay.text}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Connection status is automatically managed
              </p>
            </div>
            <div>
              <Label htmlFor="relationshipStatus" className="text-sm font-medium">
                Relationship Status
              </Label>
              <Select 
                value={relationshipStatus} 
                onValueChange={(value: "dating" | "engaged" | "married" | "partnered") => setRelationshipStatus(value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dating">Dating</SelectItem>
                  <SelectItem value="engaged">Engaged</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="partnered">Partnered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">
                Anniversary Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full mt-1 justify-start text-left font-normal",
                      !anniversaryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {anniversaryDate ? format(anniversaryDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={anniversaryDate}
                    onSelect={setAnniversaryDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isProcessing}
                className="flex-1 bg-gradient-primary hover:opacity-90 text-white"
                size="sm"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={14} className="mr-1" />
                    Save
                  </>
                )}
              </Button>
              <Button 
                onClick={handleCancel}
                variant="outline"
                size="sm"
                disabled={isProcessing}
              >
                <X size={14} className="mr-1" />
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <Label className="text-sm text-muted-foreground">Connection Status</Label>
              <p className={`text-sm font-medium mt-1 ${statusDisplay.color}`}>
                {statusDisplay.text}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Relationship Status</Label>
              <p className="text-sm font-medium mt-1 capitalize">
                {coupleData?.relationship_status || 'Not set'}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Anniversary Date</Label>
              <p className="text-sm font-medium mt-1">
                {coupleData?.anniversary_date 
                  ? format(new Date(coupleData.anniversary_date), "PPP")
                  : 'Not set'}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};