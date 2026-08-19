import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api.js";

export default function Join() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .joinByToken(token)
      .then(({ boardId }) => navigate(`/board/${boardId}`, { replace: true }))
      .catch(() => setError(true));
  }, [token]);

  if (error) {
    return (
      <div className="center-screen">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Invalid or expired link</h3>
        </div>
      </div>
    );
  }
  return null;
}
