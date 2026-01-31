(ns pet-app.api.helpers
  "Common helper functions for API responses.")

(defn ok
  "Return 200 OK with body."
  ([body]
   {:status 200
    :body body}))

(defn created
  "Return 201 Created with body."
  [body]
  {:status 201
   :body body})

(defn error
  "Return error response with status and message."
  ([status message]
   {:status status
    :body {:error message}})
  ([message]
   (error 500 message)))

(defn bad-request
  "Return 400 Bad Request with details."
  [details]
  {:status 400
   :body {:error "Bad Request"
          :details details}})

(defn not-found
  "Return 404 Not Found."
  ([]
   {:status 404
    :body {:error "Not Found"}})
  ([message]
   {:status 404
    :body {:error "Not Found"
           :message message}}))
