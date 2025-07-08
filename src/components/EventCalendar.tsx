
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar, Plus, MapPin, Clock, Users, Edit, Trash2, Loader2 } from "lucide-react";
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

  const fetchEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Simplified query without the problematic join
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

  useEffect(() => {
    if (user) {
      fetchEvents();
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
      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update({
            title: newEvent.title,
            description: newEvent.description || null,
            start_date: newEvent.start_date,
            end_date: newEvent.end_date,
            location: newEvent.location || null,
            event_type: newEvent.event_type,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEvent.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Event updated successfully!",
        });
        
        setEditingEvent(null);
      } else {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .insert({
            title: newEvent.title,
            description: newEvent.description || null,
            start_date: newEvent.start_date,
            end_date: newEvent.end_date,
            location: newEvent.location || null,
            event_type: newEvent.event_type,
            created_by: user.id
          })
          .select()
          .single();

        if (eventError) throw eventError;

        // Create participant entry for the creator
        const { error: participantError } = await supabase
          .from('event_participants')
          .insert({
            event_id: eventData.id,
            user_id: user.id,
            status: 'accepted'
          });

        if (participantError) {
          console.warn('Could not add participant:', participantError);
          // Don't throw error as event creation was successful
        }

        toast({
          title: "Success",
          description: "Event created successfully!",
        });
      }

      setNewEvent({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        location: '',
        event_type: 'meeting'
      });
      setIsDialogOpen(false);
      fetchEvents(); // Refresh events list

    } catch (error) {
      console.error('Error creating/updating event:', error);
      toast({
        title: "Error",
        description: "Failed to save event. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return;

    try {
      // Delete participants first (if any)
      await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId);

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully!",
      });

      fetchEvents(); // Refresh events list

    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive"
      });
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description || '',
      start_date: event.start_date.slice(0, 16),
      end_date: event.end_date.slice(0, 16),
      location: event.location || '',
      event_type: event.event_type
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
    setNewEvent({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      location: '',
      event_type: 'meeting'
    });
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
      default: return 'bg-gray-100 text-gray-800';
    }
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

        <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {editingEvent ? 'Update event details' : 'Add a new event to the calendar'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter event title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="text-base" // Prevent zoom on iOS
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter event description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="text-base min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_date" className="text-sm font-medium">Start Date & Time *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    className="text-base"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date" className="text-sm font-medium">End Date & Time *</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={newEvent.end_date}
                    onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                    className="text-base"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                <Input
                  id="location"
                  placeholder="Enter event location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="text-base"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="event_type" className="text-sm font-medium">Event Type</Label>
                <select
                  id="event_type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background"
                  value={newEvent.event_type}
                  onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                >
                  <option value="meeting">Meeting</option>
                  <option value="workshop">Workshop</option>
                  <option value="conference">Conference</option>
                  <option value="social">Social</option>
                  <option value="training">Training</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2">
              <Button variant="outline" onClick={closeDialog} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleCreateOrUpdateEvent} className="w-full sm:w-auto">
                {editingEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Events List - Mobile optimized */}
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
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div>{format(parseISO(event.start_date), 'MMM dd, yyyy HH:mm')}</div>
                        <div>to {format(parseISO(event.end_date), 'MMM dd, yyyy HH:mm')}</div>
                      </div>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No events yet</h3>
              <p className="text-sm text-gray-600 mb-4">Create your first event to get started</p>
              <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
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
