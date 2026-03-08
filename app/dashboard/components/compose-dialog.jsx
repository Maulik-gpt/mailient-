export default function ComposeDialog({ open, onOpenChange, replyTo, onSend }) {
  return (
    <div className={open ? "block" : "hidden"}>
      <h3>Compose Email</h3>
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  );
}