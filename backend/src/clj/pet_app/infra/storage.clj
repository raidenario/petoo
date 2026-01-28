(ns pet-app.infra.storage
  (:require [clojure.java.io :as io])
  (:import [java.util UUID]))

(def upload-dir "resources/public/uploads/")

(defn- get-extension [filename]
  (let [idx (.lastIndexOf filename ".")]
    (if (pos? idx)
      (subs filename idx)
      "")))

(defn save-file!
  "Recebe o mapa do arquivo vindo do Ring e salva no disco.
   Retorna a URL relativa para acessar o arquivo via navegador."
  [{:keys [tempfile filename]}]
  (when (and tempfile filename)
    (.mkdirs (io/file upload-dir))
    (let [new-name (str (UUID/randomUUID) (get-extension filename))
          dest-file (io/file upload-dir new-name)]
      (io/copy tempfile dest-file)
      (str "/uploads/" new-name))))
