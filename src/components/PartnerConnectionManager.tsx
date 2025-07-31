import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, Users, Mail, Calendar as CalendarIcon, Trash2, Check, X, Clock, Send, UserX } from "lucide-react";
import { usePartnerConnection } from "@/hooks/usePartnerConnection";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const PartnerConnectionManager = () => {
  const {
    coupleData,
    userProfile,
    partnerProfile,
    incomingRequests,
    outgoingRequests,
    loading,
    isProcessing,
    isDemoMode,
    sendPartnerRequest,
    acceptPartnerRequest,
    declinePartnerRequest,
    removePartnerConnection,
    updateRelationshipDetails,
    cancelOutgoingRequest
  } = usePartnerConnection();

  const [partnerEmail, setPartnerEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState(coupleData?.relationship_status || 'dating');
  const [anniversaryDate, setAnniversaryDate] = useState<Date | undefined>(
    coupleData?.anniversary_date ? new Date(coupleData.anniversary_date) : undefined
  );

  // Handle sending partner request
  const handleSendRequest = async () => {
    if (!partnerEmail.trim()) return;
    
    const success = await sendPartnerRequest(partnerEmail);
    if (success) {
      setPartnerEmail("");
    }
  };

  // Handle relationship details update
  const handleUpdateRelationship = async () => {
    const success = await updateRelationshipDetails(relationshipStatus, anniversaryDate);
    if (success) {
      setEditing(false);
    }
  };

  // Reset form when editing changes
  const handleEditToggle = () => {
    if (!editing) {
      setRelationshipStatus(coupleData?.relationship_status || 'dating');
      setAnniversaryDate(coupleData?.anniversary_date ? new Date(coupleData.anniversary_date) : undefined);
    }
    setEditing(!editing);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Partner Connection */}
      {coupleData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart size={20} />
                Current Connection
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditToggle}
                disabled={isProcessing}
              >
                {editing ? "Cancel" : "Edit"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Partner Info */}
            <div className="bg-pink-50 border border-pink-200 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
                  <Heart className="text-white" size={16} />
                </div>
                <h4 className="font-semibold text-pink-800">Partner</h4>
              </div>
              
              {isDemoMode ? (
                <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-600">⚠️</span>
                    <span className="text-yellow-800 text-sm font-medium">
                      Demo Mode: You're currently exploring features solo
                    </span>
                  </div>
                </div>
              ) : partnerProfile ? (
                <div className="space-y-3">
                  <div className="bg-white border border-pink-300 p-3 rounded-md">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-semibold text-pink-800 uppercase tracking-wide">Name</span>
                      <span className="text-sm text-pink-700">{partnerProfile.display_name || 'Not set'}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-pink-300 p-3 rounded-md">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-semibold text-pink-800 uppercase tracking-wide">Status</span>
                      <span className="text-sm text-pink-700">Connected</span>
                    </div>
                  </div>
                  {!editing && (
                    <Button
                      variant="outline"
                      onClick={removePartnerConnection}
                      disabled={isProcessing}
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      size="sm"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Remove Partner Connection
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-pink-700">No partner connected</p>
              )}
            </div>

            {/* Relationship Details */}
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <CalendarIcon className="text-white" size={16} />
                </div>
                <h4 className="font-semibold text-gray-800">Relationship Details</h4>
              </div>
              
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="relationshipStatus" className="text-sm font-medium text-gray-800">
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
                    <Label className="text-sm font-medium text-gray-800">
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
                  
                  <Button
                    onClick={handleUpdateRelationship}
                    disabled={isProcessing}
                    className="w-full bg-gradient-primary hover:opacity-90 text-white shadow-romantic"
                    size="sm"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      'Update Relationship Details'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white border border-gray-300 p-3 rounded-md">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Status</span>
                      <span className="text-sm text-gray-700 capitalize">{coupleData.relationship_status}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-300 p-3 rounded-md">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Anniversary</span>
                      <span className="text-sm text-gray-700">
                        {coupleData.anniversary_date 
                          ? format(new Date(coupleData.anniversary_date), "PPP")
                          : 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send New Partner Request */}
      {(isDemoMode || !coupleData) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send size={20} />
              Connect with Partner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="partnerEmail">Partner's Email</Label>
              <Input
                id="partnerEmail"
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="partner@example.com"
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Enter your partner's email to send a connection request
              </p>
            </div>
            <Button 
              onClick={handleSendRequest}
              disabled={isProcessing || !partnerEmail.trim()}
              className="w-full bg-gradient-secondary hover:opacity-90 text-white shadow-romantic"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Send Connection Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Incoming Partner Requests */}
      {incomingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail size={20} />
              Incoming Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incomingRequests.map((request) => (
                <div key={request.id} className="bg-blue-50 border border-blue-300 p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Request from: {request.requested_email}
                      </p>
                      <p className="text-xs text-blue-600">
                        <Clock className="inline w-3 h-3 mr-1" />
                        {format(new Date(request.created_at), "PPP")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptPartnerRequest(request.id)}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => declinePartnerRequest(request.id)}
                        disabled={isProcessing}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outgoing Partner Requests */}
      {outgoingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {outgoingRequests.map((request) => (
                <div key={request.id} className="bg-yellow-50 border border-yellow-300 p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Sent to: {request.requested_email}
                      </p>
                      <p className="text-xs text-yellow-600">
                        <Clock className="inline w-3 h-3 mr-1" />
                        {format(new Date(request.created_at), "PPP")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelOutgoingRequest(request.id)}
                      disabled={isProcessing}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};