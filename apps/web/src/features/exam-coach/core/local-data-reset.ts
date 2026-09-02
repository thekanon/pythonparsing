import { resetGuestLearningData, type StorageLike } from "./local-store";
import { resetLocalProfileData } from "./local-profile";

export function resetAllLocalGuestData(storage: StorageLike): void {
  resetGuestLearningData(storage);
  resetLocalProfileData(storage);
}
