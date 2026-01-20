I will optimize the Steam Monitor application to address the performance, UI, and notification requirements.

### Plan

1.  **Refactor `useGameStore.ts` for Performance & Logic**:
    *   **Concurrency**: Replace the sequential `for` loop in `refreshGames` with a batched parallel approach (using `Promise.all` with a concurrency limit of 5-6) to significantly speed up updates.
    *   **Notification Logic**: Update the refresh logic to trigger system notifications for *both* manual and auto refreshes when updates are found.
    *   **Progress Tracking**: Ensure `refreshProgress` accurately reflects the parallel processing state.

2.  **Enhance System Notifications (`sw.js` & `notificationService.ts`)**:
    *   **Click Behavior**: Modify the Service Worker (`public/sw.js`) to focus the *Monitor Application* tab when a notification is clicked, rather than opening the Steam Store directly (allowing the user to see the in-app summary modal).
    *   **Content**: Ensure the notification title and body clearly state the updated game's name.

3.  **Implement UI Changes**:
    *   **Create `RefreshToast.tsx`**: A new component to display the refresh progress (e.g., "Refreshing 30/45... (AppID)") in a fixed popup at the bottom-right corner.
    *   **Update `Header.tsx`**: Remove the text-based progress from the Refresh button.
    *   **Update `App.tsx`**:
        *   Integrate the `RefreshToast` component.
        *   Change the auto-refresh interval from 5 minutes to **15 minutes**.

4.  **Verification of Persistence**:
    *   The current `persist` middleware implementation is correct for `localStorage`. I will verify that no code is inadvertently clearing the state. (The user's issue might be due to development server restarts or browser profile switching; I will clarify this).

### Execution Order
1.  Update `src/services/steamApi.ts` (if needed for concurrency support, though logic is mostly in store).
2.  Update `public/sw.js` for click handling.
3.  Update `src/store/useGameStore.ts` (Concurrency, Logic).
4.  Create `src/components/RefreshToast.tsx`.
5.  Update `src/components/Header.tsx` (Clean up button).
6.  Update `src/App.tsx` (Interval, Toast).
