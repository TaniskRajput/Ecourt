export default function Loader({ show }) {
    if (!show) return null;
    return (
        <div className="loader-overlay">
            <div className="spinner" />
        </div>
    );
}
