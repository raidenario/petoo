(ns pet-app.infra.db
  "Database adapter using next.jdbc and HoneySQL.
   
   Provides utilities for database operations with the PostgreSQL connection pool."
  (:require [next.jdbc :as jdbc]
            [next.jdbc.result-set :as rs]
            [next.jdbc.prepare :as prepare]
            [honey.sql :as sql]
            [clojure.tools.logging :as log]
            [clojure.data.json :as json])
  (:import [org.postgresql.util PGobject]))

;; ============================================
;; JSONB Support for next.jdbc
;; ============================================

(extend-protocol rs/ReadableColumn
  PGobject
  (read-column-by-label [^PGobject v _]
    (let [type (.getType v)
          value (.getValue v)]
      (if (#{"json" "jsonb"} type)
        (when value (json/read-str value :key-fn keyword))
        value)))
  (read-column-by-index [^PGobject v _ _]
    (let [type (.getType v)
          value (.getValue v)]
      (if (#{"json" "jsonb"} type)
        (when value (json/read-str value :key-fn keyword))
        value))))

(defn- ->pgobject [v]
  (doto (PGobject.)
    (.setType "jsonb")
    (.setValue (json/write-str v))))

(extend-protocol prepare/SettableParameter
  clojure.lang.IPersistentMap
  (set-parameter [m ^java.sql.PreparedStatement s i]
    (.setObject s i (->pgobject m)))
  clojure.lang.IPersistentVector
  (set-parameter [v ^java.sql.PreparedStatement s i]
    (.setObject s i (->pgobject v))))

;; ============================================
;; Query Options
;; ============================================

(def ^:private default-opts
  "Default options for next.jdbc queries.
   Returns results as unqualified kebab-case maps."
  {:builder-fn rs/as-unqualified-kebab-maps})

;; ============================================
;; Query Execution
;; ============================================

(defn execute!
  "Execute a SQL statement and return the results.
   
   Args:
     ds     - DataSource (HikariCP pool)
     sqlmap - HoneySQL map or raw SQL vector
   
   Returns:
     Vector of result maps"
  [ds sqlmap]
  (let [sql-vec (if (map? sqlmap)
                  (sql/format sqlmap)
                  sqlmap)]
    (log/debug "SQL:" (first sql-vec))
    (jdbc/execute! ds sql-vec default-opts)))

(defn execute-one!
  "Execute a SQL statement and return a single result.
   
   Args:
     ds     - DataSource (HikariCP pool)
     sqlmap - HoneySQL map or raw SQL vector
   
   Returns:
     Single result map or nil"
  [ds sqlmap]
  (let [sql-vec (if (map? sqlmap)
                  (sql/format sqlmap)
                  sqlmap)]
    (log/debug "SQL:" (first sql-vec))
    (jdbc/execute-one! ds sql-vec default-opts)))

;; ============================================
;; Transaction Support
;; ============================================

(defmacro with-transaction
  "Execute body within a database transaction.
   
   Usage:
     (with-transaction [tx ds]
       (execute! tx {...})
       (execute! tx {...}))"
  [[tx ds] & body]
  `(jdbc/with-transaction [~tx ~ds]
     ~@body))

;; ============================================
;; Common Queries
;; ============================================

(defn find-by-id
  "Find a record by ID.
   
   Args:
     ds    - DataSource
     table - Table keyword (e.g., :users)
     id    - UUID or string ID
   
   Returns:
     Record map or nil"
  [ds table id]
  (execute-one! ds {:select [:*]
                    :from [table]
                    :where [:= :id id]}))

(defn insert!
  "Insert a record and return the inserted row.
   
   Args:
     ds    - DataSource
     table - Table keyword
     data  - Map of column -> value
   
   Returns:
     Inserted record map"
  [ds table data]
  (execute-one! ds {:insert-into table
                    :values [data]
                    :returning [:*]}))

(defn update!
  "Update records matching conditions.
   
   Args:
     ds    - DataSource
     table - Table keyword
     data  - Map of column -> value to update
     where - HoneySQL where clause
   
   Returns:
     Updated record(s)"
  [ds table data where]
  (execute! ds {:update table
                :set data
                :where where
                :returning [:*]}))

(defn delete!
  "Delete records matching conditions.
   
   Args:
     ds    - DataSource
     table - Table keyword
     where - HoneySQL where clause
   
   Returns:
     Deleted record(s)"
  [ds table where]
  (execute! ds {:delete-from table
                :where where
                :returning [:*]}))

(defn update-pet-photo! [ds pet-id photo-url]
  (update! ds :core.pets
           {:photo-url photo-url}
           [:= :id [:cast pet-id :uuid]]))

(defn update-professional-avatar! [ds professional-id avatar-url]
  (let [professional (find-by-id ds :core.professionals [:cast professional-id :uuid])]
    (when-let [user-id (:user-id professional)]
      (update! ds :core.users
               {:avatar-url avatar-url}
               [:= :id [:cast user-id :uuid]]))))


