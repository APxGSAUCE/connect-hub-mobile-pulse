import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Plus, MapPin, Clock, Users, Edit, Trash2, Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO, isToday, isFuture, isPast } from "date-fns";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  location: string | null;
  event_type: string;
  created_by: string;
  created_at: string;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const EventCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    event_type: 'meeting'
  });
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const fetchEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched events data:', eventsData);
      setEvents(eventsData || []);

    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('status', 'active');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchEmployees();
    }
  }, [user]);

  // Set up real-time subscription for events
  useRealtimeSubscription('events', fetchEvents, [user]);

  const handleCreateOrUpdateEvent = async () => {
    if (!user) return;

    if (!newEvent.title || !newEvent.start_date || !newEvent.end_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (new Date(newEvent.start_date) >= new Date(newEvent.end_date)) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const eventData = {
        title: newEvent.title,
        description: newEvent.description || null,
        start_date: newEvent.start_date,
        end_date: newEvent.end_date,
        location: newEvent.location || null,
        event_type: newEvent.event_type,
        created_by: user.id
      };

      if (editingEvent) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);

        if (error) {
          console.error('Error updating event:', error);
          throw error;
        }

        // Update participants
        if (selectedParticipants.length > 0) {
          // Remove existing participants
          await supabase
            .from('event_participants')
            .delete()
            .eq('event_id', editingEvent.id);

          // Add new participants
          const participantData = selectedParticipants.map(participantId => ({
            event_id: editingEvent.id,
            user_id: participantId,
            status: 'invited'
          }));

          const { error: participantError } = await supabase
            .from('event_participants')
            .insert(participantData);

          if (participantError) {
            console.error('Error updating participants:', participantError);
          }
        }

        toast({
          title: "Success",
          description: "Event updated successfully"
        });
      } else {
        // Create new event
        const { data, error } = await supabase
          .from('events')
          .insert([eventData])
          .select()
          .single();

        if (error) {
          console.error('Error creating event:', error);
          toast({
            title: "Error",
            description: `Failed to create event: ${error.message}`,
            variant: "destructive"
          });
          return;
        }

        console.log('Event created successfully:', data);

        // Add participants to the event
        if (selectedParticipants.length > 0) {
          const participantData = selectedParticipants.map(participantId => ({
            event_id: data.id,
            user_id: participantId,
            status: 'invited'
          }));

          const { error: participantError } = await supabase
            .from('event_participants')
            .insert(participantData);

          if (participantError) {
            console.error('Error adding participants:', participantError);
            toast({
              title: "Warning", 
              description: "Event created but failed to add some participants",
              variant: "destructive"
            });
          }
        }

        toast({
          title: "Success",
          description: "Event created successfully"
        });
      }

      // Don't manually refetch - let realtime updates handle it
      closeDialog();

    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Error",
        description: "Failed to save event",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      // Delete participants first
      await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId);

      // Delete the event
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('created_by', user.id);

      if (error) {
        console.error('Error deleting event:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Event deleted successfully"
      });

      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive"
      });
    }
  };

  const handleEditEvent = async (event: Event) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description || '',
      start_date: event.start_date,
      end_date: event.end_date,
      location: event.location || '',
      event_type: event.event_type
    });

    // Fetch existing participants
    try {
      const { data: participants, error } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', event.id);

      if (!error && participants) {
        setSelectedParticipants(participants.map(p => p.user_id));
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }

    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setNewEvent({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      location: '',
      event_type: 'meeting'
    });
    setSelectedParticipants([]);
    setEditingEvent(null);
  };

  const getEventStatus = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const now = new Date();

    if (isPast(end)) return { status: 'past', color: 'bg-gray-100 text-gray-800' };
    if (isToday(start) || (start <= now && end >= now)) return { status: 'ongoing', color: 'bg-green-100 text-green-800' };
    if (isFuture(start)) return { status: 'upcoming', color: 'bg-blue-100 text-blue-800' };
    return { status: 'unknown', color: 'bg-gray-100 text-gray-800' };
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800';
      case 'workshop': return 'bg-purple-100 text-purple-800';
      case 'conference': return 'bg-green-100 text-green-800';
      case 'social': return 'bg-yellow-100 text-yellow-800';
      case 'training': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const getEmployeeName = (employee: Profile) => {
    return employee.first_name && employee.last_name 
      ? `${employee.first_name} ${employee.last_name}`
      : employee.email || 'Unknown User';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-6 px-1 sm:px-0">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Events Calendar</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage and view upcoming events</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[85vh] overflow-y-auto mx-auto p-4 sm:p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-base sm:text-lg">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingEvent ? 'Update event details' : 'Add a new event to the calendar'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:gap-4 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="title" className="text-xs sm:text-sm font-medium">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter event title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="text-sm h-9"
                />
              </div>
              
              <div className="grid gap-1.5">
                <Label htmlFor="description" className="text-xs sm:text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter event description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="text-sm min-h-[60px] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="start_date" className="text-xs sm:text-sm font-medium">Start Date & Time *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    className="text-sm h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="end_date" className="text-xs sm:text-sm font-medium">End Date & Time *</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={newEvent.end_date}
                    onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                    className="text-sm h-9"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="location" className="text-xs sm:text-sm font-medium">Location</Label>
                <Input
                  id="location"
                  placeholder="Enter event location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="text-sm h-9"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="event_type" className="text-xs sm:text-sm font-medium">Event Type</Label>
                <Select
                  value={newEvent.event_type}
                  onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Participants Selection */}
              <div className="grid gap-1.5">
                <Label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  <UserPlus className="w-3 h-3" />
                  Event Participants
                </Label>
                <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                  {employees.length > 0 ? (
                    <div className="space-y-1.5">
                      {employees.map((employee) => (
                        <div key={employee.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={employee.id}
                            checked={selectedParticipants.includes(employee.id)}
                            onCheckedChange={() => toggleParticipant(employee.id)}
                            className="h-3.5 w-3.5"
                          />
                          <label
                            htmlFor={employee.id}
                            className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {getEmployeeName(employee)}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No employees found</p>
                  )}
                </div>
                {selectedParticipants.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {selectedParticipants.length} participant(s) selected
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog} className="w-full sm:w-auto h-8 sm:h-9 text-xs sm:text-sm">
                Cancel
              </Button>
              <Button onClick={handleCreateOrUpdateEvent} className="w-full sm:w-auto h-8 sm:h-9 text-xs sm:text-sm" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    {editingEvent ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingEvent ? 'Update Event' : 'Create Event'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Events List */}
      <div className="space-y-3 sm:space-y-4">
        {events.length > 0 ? (
          events.map((event) => {
            const eventStatus = getEventStatus(event.start_date, event.end_date);
            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{event.title}</CardTitle>
                      {event.description && (
                        <CardDescription className="mt-1 text-sm line-clamp-2">
                          {event.description}
                        </CardDescription>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`${getEventTypeColor(event.event_type)} text-xs`}>
                        {event.event_type}
                      </Badge>
                      <Badge className={`${eventStatus.color} text-xs`}>
                        {eventStatus.status}
                      </Badge>
                      
                      {user && event.created_by === user.id && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEvent(event)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {format(parseISO(event.start_date), 'PPP p')} - {format(parseISO(event.end_date), 'PPP p')}
                      </span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Created by {user?.id === event.created_by ? 'You' : 'Another user'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-500 mb-4">Create your first event to get started</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EventCalendar;