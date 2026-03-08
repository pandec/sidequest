import { useEffect, useState } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useStoreUser() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    if (!isAuthenticated) {
      setUserId(null);
      return;
    }
    async function sync() {
      const id = await storeUser();
      setUserId(id);
    }
    sync();
  }, [isAuthenticated, storeUser]);

  return {
    isLoading: isLoading || (isAuthenticated && userId === null),
    isAuthenticated: isAuthenticated && userId !== null,
    userId,
  };
}
