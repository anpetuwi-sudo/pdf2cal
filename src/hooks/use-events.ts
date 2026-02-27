import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertEvent } from "@shared/routes";

// Although the core logic of this specific app is client-side parsing, 
// we maintain the standard hook structure for future backend integration.

export function useEvents() {
  return useQuery({
    queryKey: [api.events.list.path],
    queryFn: async () => {
      const res = await fetch(api.events.list.path);
      if (!res.ok) throw new Error("Failed to fetch events");
      return api.events.list.responses[200].parse(await res.json());
    },
    // For this offline-focused version, we might not actually fetch from backend often,
    // but the structure is here.
    enabled: false 
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event: InsertEvent) => {
      const res = await fetch(api.events.create.path, {
        method: api.events.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!res.ok) throw new Error("Failed to create event");
      return api.events.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.events.list.path] });
    },
  });
}
