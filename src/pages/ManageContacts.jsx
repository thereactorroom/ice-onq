import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Pencil, Star, Phone } from "lucide-react";
import EditContactDialog from "../components/EditContactDialog";

export default function ManageContacts({ profileId: profileIdProp, fusionUserId }) {
  const qc = useQueryClient();
  const [editContact, setEditContact] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });

  // If no profileId prop, look up the user's own profile
  const { data: profiles = [] } = useQuery({
    queryKey: ["iceProfile", user?.email],
    queryFn: () => base44.entities.ICEProfile.filter({ created_by: user.email }),
    enabled: !!user?.email && !profileIdProp,
  });
  const profileId = profileIdProp || profiles[0]?.id;

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["iceContacts", profileId, fusionUserId],
    queryFn: async () => {
      const res = await base44.functions.invoke("manageICEContact", {
        action: "list", profileId, fusionUserId,
      });
      return res.data.contacts;
    },
    enabled: !!profileId,
  });

  const sorted = [...contacts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.priority || 0) - (b.priority || 0);
  });

  const createMut = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke("manageICEContact", {
        action: "create", profileId, contactData: { ...data, priority: contacts.length }, fusionUserId,
      });
      return res.data.contact;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["iceContacts"] }),
  });
  const updateMut = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await base44.functions.invoke("manageICEContact", {
        action: "update", profileId, contactId: id, contactData: data, fusionUserId,
      });
      return res.data.contact;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["iceContacts"] }),
  });
  const deleteMut = useMutation({
    mutationFn: async (id) => {
      await base44.functions.invoke("manageICEContact", {
        action: "delete", profileId, contactId: id, fusionUserId,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["iceContacts"] }),
  });

  const handleSave = async (formData) => {
    if (editContact) {
      await updateMut.mutateAsync({ id: editContact.id, data: formData });
    } else {
      await createMut.mutateAsync(formData);
    }
  };

  const onDragEnd = ({ source, destination }) => {
    if (!destination) return;
    const next = [...sorted];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    next.forEach((c, i) => {
      if (c.priority !== i) {
        updateMut.mutate({ id: c.id, data: { priority: i } });
      }
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">Emergency Contacts</h2>
          <p className="text-sm text-muted-foreground">Drag to reorder priority. Primary contact appears first.</p>
        </div>
        <Button className="gap-1.5" onClick={() => { setEditContact(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Contact
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground mb-4">No emergency contacts yet. Add someone who should be contacted in an emergency.</p>
          <Button variant="outline" className="gap-1.5" onClick={() => { setEditContact(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Your First Contact
          </Button>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="contacts">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {sorted.map((contact, idx) => (
                  <Draggable key={contact.id} draggableId={String(contact.id)} index={idx}>
                    {(p) => (
                      <div
                        ref={p.innerRef}
                        {...p.draggableProps}
                        {...p.dragHandleProps}
                        className="select-none cursor-grab active:cursor-grabbing bg-card rounded-xl border border-border p-4 flex items-center gap-3 transition-shadow hover:shadow-md"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground truncate">{contact.full_name}</span>
                            {contact.is_primary && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emergency/10 text-emergency rounded text-[10px] font-bold">
                                <Star className="w-2.5 h-2.5 fill-current" /> PRIMARY
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{contact.relationship}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.mobile}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditContact(contact); setDialogOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <EditContactDialog open={dialogOpen} onOpenChange={setDialogOpen} contact={editContact} onSave={handleSave} onDelete={(id) => { deleteMut.mutate(id); }} />


    </div>
  );
}