import pandas as pd

# Load only the columns you need
df = pd.read_csv("./data/chicago_crime.csv", usecols=["Year", "Primary Type"])

df['Primary Type'] = (df['Primary Type']
    .replace('CRIM SEXUAL ASSAULT', 'CRIMINAL SEXUAL ASSAULT')
    .replace('SEX OFFENSE', "CRIMINAL SEXUAL ASSAULT"))

# Drop rows where year couldn't be parsed
df = df.dropna(subset=["Year"])

# Group by Year and Crime Type
agg = df.groupby(["Year", "Primary Type"]).size().reset_index(name="Count")

# Save the aggregated file
agg.to_csv("grouped_crime_by_year_and_type.csv", index=False)