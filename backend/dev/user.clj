(ns user
  "REPL development utilities."
  (:require [pet-app.core :as core]
            [pet-app.system :as system]))

(defn go
  "Start the system."
  []
  (core/-main "dev"))

(defn halt
  "Stop the system."
  []
  (core/stop))

(defn restart
  "Restart the system."
  []
  (core/restart))
