# CAD Tool — Geplante Änderungen

## 1. Sphäre — Darstellung

- Sphäre runder und optisch schöner machen
- Sphäre muss immer im Vordergrund bleiben (über allem rendern)

## 2. Sphäre — Rotation / Navigation

Alles (Bauteil, Umgebung, Sphäre selbst) dreht sich um den Mittelpunkt der Sphäre.

- **Mittlere Maustaste auf Punkt der Sphäre + Bewegung** → Arcball-artige Rotation: es soll sich anfühlen, als würde man den berührten Punkt der Sphäre physisch drehen
- **Mittlere Maustaste außerhalb der Sphäre + Bewegung** → Rotation um die Bildschirm-Normale (alles parallel zum Bildschirm drehen)

## 3. Sphäre — Größe & Mittelpunkt

- Slider/Balken hinzufügen, mit dem die Sphäre größer/kleiner gemacht werden kann
- Mittelpunkt der Sphäre ist **nicht** an das Modell oder das Achsensystem gebunden
- Mittelpunkt = der aktuelle Drehpunkt, um den mit der Maus rotiert wird

## 4. Mittelklick auf Modell

- **Einfacher Mittelklick auf Modellpunkt**
  - Sphäre + Bildschirm-Mittelpunkt springen zu diesem Punkt
  - Ab jetzt dreht sich alles um diesen neuen Punkt
  - **3 Sekunden warten**, bevor die Sphäre an den Punkt geführt wird (Unterscheidung zu Doppelklick)
- **Doppelter Mittelklick auf Fläche**
  - Fläche wird ausgewählt
  - Fläche wird zum Bildschirm ausgerichtet (parallel zur Bildschirmebene gedreht)

## 5. GLB-Datei — Eigenschaften sichtbar machen

- Möglichst alle Eigenschaften aus der GLB-Datei extrahieren und darstellen
- Anzeige entweder direkt optisch oder per **Rechtsklick** auf das Modell
- Farbe des Modells ebenfalls anzeigen

## 6. Teile-Panel (links)

Wenn ein Modell geladen ist, sollen die Teile links sichtbar sein.

Zusätzliche Funktionen:

- **Achse erstellen** durch Klick auf eine Zylinderfläche
- **Ebene erstellen**
  - über zwei Achsen, oder
  - über eine Achse + eine Achse des Achsensystems

## 7. Schnitt als eigene Funktion

- Schnitt in eine eigene Funktion auslagern
- Schnitt an einer frei wählbaren Ebene durchführen
- Schnittposition mit Slider/Balken hin- und herbewegen
- Erstellte **Achsen** und **Ebenen** im Modell speichern
- Persistenz auch auf dem Server ablegen

## 8. Ausrichten-Funktion (Bauteil / Baugruppe)

Neue Funktion: Bauteil oder Baugruppe am Achsensystem ausrichten.

- Eine **Achse** des Modells wählen → wird auf X-, Y- oder Z-Achse ausgerichtet
- Eine **Fläche** des Modells wählen → wird auf XY-, XZ- oder YZ-Ebene ausgerichtet
- Ausrichtung erfolgt über die Geometrie des Bauteils

## 9. Erweiterung der Schnittfunktion

- In der Schnittfunktion sollen zusätzlich die **Achsensystem-Ebenen** (XY, XZ, YZ) als Schnittebene wählbar sein
