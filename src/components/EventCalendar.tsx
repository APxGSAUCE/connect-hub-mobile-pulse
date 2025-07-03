
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
  participants?: EventParticipant[];
}

interface EventParticipant {
  id: string;
  user_id: string;
  status: 'invited' | 'accepted' | 'declined' | 'maybe';
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
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

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  // Set up real-time subscription for events
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          console.log('Events changed, refetching...');
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch events with participants
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          *,
          event_participants!inner (
            id,
            user_id,
            status,
            profiles (
              first_name,
              last_name,
              email
            )
          )
        `)
        .order('start_date', { ascending: true });

      if (error) throw error;

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
        // Update existing event
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
        // Create new event
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

        // Add creator as participant
        const { error: participantError } = await supabase
          .from('event_participants')
          .insert({
            event_id: eventData.id,
            user_id: user.id,
            status: 'accepted'
          });

        if (participantError) throw participantError;

        toast({
          title: "Success",
          description: "Event created successfully!",
        });
      }

      // Reset form
      setNewEvent({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        location: '',
        event_type: 'meeting'
      });
      setIsDialogOpen(false);
      
      // Refresh events
      fetchEvents();

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
      // Delete participants first
      await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId);

      // Delete event
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully!",
      });

      fetchEvents();

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
      start_date: event.start_date.slice(0, 16), // Format for datetime-local input
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
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Events Calendar</h2>
          <p className="text-gray-600">Manage and view upcoming events</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </DialogTitle>
              <DialogDescription>
                {editingEvent ? 'Update event details' : 'Add a new event to the calendar'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter event title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter event description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_date">Start Date & Time *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date">End Date & Time *</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={newEvent.end_date}
                    onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Enter event location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="event_type">Event Type</Label>
                <select
                  id="event_type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
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
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrUpdateEvent}>
                {editingEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.length > 0 ? (
          events.map((event) => {
            const eventStatus = getEventStatus(event.start_date, event.end_date);
            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      {event.description && (
                        <CardDescription className="mt-1">
                          {event.description}
                        </CardDescription>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {event.event_type}
                      </Badge>
                      <Badge className={eventStatus.color}>
                        {eventStatus.status}
                      </Badge>
                      
                      {user && event.created_by === user.id && (
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEvent(event)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(parseISO(event.start_date), 'MMM dd, yyyy HH:mm')} - {format(parseISO(event.end_date), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    
                    {event.participants && event.participants.length > 0 && (
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{event.participants.length} participant(s)</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-600 mb-4">Create your first event to get started</p>
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
