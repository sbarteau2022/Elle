import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB

class SentimentAnalysis:
    def __init__(self, train_data, test_data):
        self.train_data = train_data
        self.test_data = test_data
        self.vectorizer = TfidfVectorizer()
        self.classifier = MultinomialNB()

    def train(self):
        X_train, y_train = self.train_data
        X_test, y_test = self.test_data
        X_train_tfidf = self.vectorizer.fit_transform(X_train)
        self.classifier.fit(X_train_tfidf, y_train)

    def predict(self, text):
        text_tfidf = self.vectorizer.transform([text])
        return self.classifier.predict(text_tfidf)
